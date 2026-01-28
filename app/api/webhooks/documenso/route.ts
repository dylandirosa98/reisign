import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSignedContractEmail, sendSellerSignedEmail } from '@/lib/services/email'
import { documenso } from '@/lib/documenso'

// Webhook secret for verification (configure in Documenso)
const WEBHOOK_SECRET = process.env.DOCUMENSO_WEBHOOK_SECRET

interface DocumensoWebhookPayload {
  event: string
  payload: {
    id: string
    externalId?: string
    status?: string
    recipients?: Array<{
      email: string
      signingStatus: string
      signedAt?: string
    }>
  }
}

// POST /api/webhooks/documenso - Handle Documenso webhook events
export async function POST(request: NextRequest) {
  // Verify webhook signature - secret is required
  if (!WEBHOOK_SECRET) {
    console.error('DOCUMENSO_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = request.headers.get('x-documenso-secret')
  if (signature !== WEBHOOK_SECRET) {
    console.warn('Invalid Documenso webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('=== DOCUMENSO WEBHOOK RAW BODY ===')
    console.log(JSON.stringify(body, null, 2))
    console.log('=================================')

    // Handle different payload structures
    // Some webhooks send { event, payload }, others send the event directly
    let event: string
    let payload: DocumensoWebhookPayload['payload']

    if (body.event && body.payload) {
      // Standard format: { event: "...", payload: {...} }
      event = body.event
      payload = body.payload
    } else if (body.event && body.data) {
      // Alternative format: { event: "...", data: {...} }
      event = body.event
      payload = body.data
    } else if (body.type) {
      // Another format: { type: "document.completed", document: {...} }
      event = body.type
      payload = body.document || body
    } else {
      // Try to extract from body directly
      event = body.event || body.type || 'unknown'
      payload = body.payload || body.data || body
    }

    console.log('Documenso webhook received:', event)
    console.log('Payload:', JSON.stringify(payload, null, 2))

    // Extract contract ID from externalId
    // Three-party format: "contract::{uuid}::{type}::{party}" (seller or buyer)
    // Standard format: "contract::{uuid}::{type}"
    // Old format: "contract-{uuid}-{type}" (still supported for existing documents)
    const externalId = payload.externalId
    if (!externalId?.startsWith('contract')) {
      console.log('Webhook not for a contract, ignoring')
      return NextResponse.json({ received: true })
    }

    let contractId: string
    let contractType: string
    let stageFromExternalId: string | undefined // 'seller' or 'buyer' from externalId

    if (externalId.includes('::')) {
      // New format: "contract::{uuid}::{type}" or "contract::{uuid}::{type}::{party}"
      const parts = externalId.split('::')
      contractId = parts[1]
      contractType = parts[2] // 'purchase' or 'assignment'
      stageFromExternalId = parts[3] // 'seller' or 'buyer' (optional, for three-party)
    } else {
      // Old format: "contract-{uuid}-{type}" or "contract-{uuid}-{type}-{timestamp}"
      // UUID is always 36 chars, so extract it precisely
      const withoutPrefix = externalId.replace('contract-', '')
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars)
      contractId = withoutPrefix.substring(0, 36)
      // Type is after the UUID and dash
      const afterUuid = withoutPrefix.substring(37) // skip the dash after UUID
      // Type could be followed by another dash and timestamp, so get first segment
      const typeParts = afterUuid.split('-')
      contractType = typeParts[0] // 'purchase' or 'assignment'
    }

    if (!contractId) {
      console.log('Invalid externalId format')
      return NextResponse.json({ received: true })
    }

    console.log('Parsed contract ID:', contractId, 'Type:', contractType, 'Stage from externalId:', stageFromExternalId || 'none')

    const adminSupabase = createAdminClient()

    // Find the contract with custom_fields to check for three-party info
    const { data: contract, error: findError } = await adminSupabase
      .from('contracts')
      .select('id, status, company_id, documenso_document_id, seller_email, buyer_email, custom_fields, template_id')
      .eq('id', contractId)
      .single()

    if (findError || !contract) {
      console.log('Contract not found:', contractId)
      return NextResponse.json({ received: true })
    }

    // Check if this is a three-party contract based on custom_fields
    const customFields = contract.custom_fields as Record<string, unknown> | null
    const sellerDocId = customFields?.documenso_seller_document_id as string | undefined
    const buyerDocId = customFields?.documenso_buyer_document_id as string | undefined
    const hasSellerDocId = !!sellerDocId
    const hasBuyerDocId = !!buyerDocId

    // Also check company template for signature_layout
    let templateIsThreeParty = false
    const companyTemplateId = customFields?.company_template_id as string | undefined
    if (companyTemplateId) {
      const { data: templateData } = await adminSupabase
        .from('company_templates' as any)
        .select('signature_layout')
        .eq('id', companyTemplateId)
        .single()
      if (templateData && (templateData as any).signature_layout === 'three-party') {
        templateIsThreeParty = true
        console.log('Template is three-party based on company_template signature_layout')
      }
    }

    // Also check global template for signature_layout if we have template_id
    if (!templateIsThreeParty && contract.template_id) {
      const { data: globalTemplate } = await adminSupabase
        .from('templates')
        .select('signature_layout')
        .eq('id', contract.template_id)
        .single()
      if (globalTemplate && (globalTemplate as any).signature_layout === 'three-party') {
        templateIsThreeParty = true
        console.log('Template is three-party based on global template signature_layout')
      }
    }

    // Assignment contracts are typically three-party (seller -> wholesaler -> buyer)
    const isAssignmentContract = contractType === 'assignment'
    if (isAssignmentContract && !templateIsThreeParty) {
      console.log('Contract type is assignment - treating as potential three-party')
    }

    // Determine three-party stage: first from externalId, then by matching document IDs
    let threePartyStage = stageFromExternalId
    if (!threePartyStage && hasSellerDocId) {
      // Fallback: determine stage by matching document ID from payload
      const docIdFromPayload = String(payload.id)
      if (sellerDocId === docIdFromPayload) {
        threePartyStage = 'seller'
        console.log('Detected seller stage by matching document ID')
      } else if (buyerDocId === docIdFromPayload) {
        threePartyStage = 'buyer'
        console.log('Detected buyer stage by matching document ID')
      }
    }

    // Also check: if contract has seller doc ID but no buyer doc ID, and status is sent/viewed,
    // this must be the seller document completing
    if (!threePartyStage && hasSellerDocId && !hasBuyerDocId) {
      if (contract.status === 'sent' || contract.status === 'viewed') {
        threePartyStage = 'seller'
        console.log('Inferred seller stage: has seller doc ID, no buyer doc ID, status is sent/viewed')
      }
    }

    // NEW: If template is three-party OR assignment contract, and status is sent/viewed with no buyer doc,
    // assume this is the seller stage completing
    if (!threePartyStage && (templateIsThreeParty || isAssignmentContract)) {
      if ((contract.status === 'sent' || contract.status === 'viewed') && !hasBuyerDocId) {
        threePartyStage = 'seller'
        console.log('Inferred seller stage: template is three-party or assignment, status is sent/viewed, no buyer doc')
      } else if (contract.status === 'buyer_pending') {
        threePartyStage = 'buyer'
        console.log('Inferred buyer stage: status is buyer_pending')
      }
    }

    const isThreePartyContract = hasSellerDocId || templateIsThreeParty || isAssignmentContract || threePartyStage === 'seller' || threePartyStage === 'buyer'

    console.log('Is three-party contract:', isThreePartyContract, 'Three-party stage:', threePartyStage || 'none')
    console.log('Seller doc ID:', sellerDocId, 'Buyer doc ID:', buyerDocId, 'Payload doc ID:', payload.id)
    console.log('Contract status:', contract.status)

    // Helper to determine party from recipient email
    const getPartyFromEmail = (email?: string): string => {
      if (!email) return ''
      const lowerEmail = email.toLowerCase()
      if (contract.seller_email?.toLowerCase() === lowerEmail) return 'seller'
      if (contract.buyer_email?.toLowerCase() === lowerEmail) return 'assignee'
      return ''
    }

    // Get recipient email from payload if available
    const recipientEmail = payload.recipients?.[0]?.email

    let newStatus: string | null = null
    let updateData: Record<string, unknown> = {}
    let additionalMetadata: Record<string, unknown> = {}

    switch (event) {
      case 'DOCUMENT_OPENED':
      case 'document.opened': {
        // Recipient opened the document
        const viewerParty = threePartyStage || getPartyFromEmail(recipientEmail)
        console.log(`Document viewed by ${viewerParty || 'unknown'} (${recipientEmail})`)

        // Update contract status to viewed only if still in sent status
        if (contract.status === 'sent') {
          newStatus = 'viewed'
          updateData = {
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          }
          additionalMetadata = {
            action: 'recipient_viewed',
            party: viewerParty,
            recipient_email: recipientEmail,
          }
        } else if (contract.status === 'buyer_pending') {
          // Buyer opened their document - record but don't change status
          await adminSupabase
            .from('contract_status_history')
            .insert({
              contract_id: contractId,
              status: contract.status,
              metadata: {
                action: 'buyer_viewed',
                party: 'buyer',
                recipient_email: recipientEmail,
                event,
                contract_type: contractType,
                three_party_stage: threePartyStage,
              },
            })
        } else {
          // Status already changed, just record the view event
          await adminSupabase
            .from('contract_status_history')
            .insert({
              contract_id: contractId,
              status: contract.status || 'sent',
              metadata: {
                action: 'recipient_viewed',
                party: viewerParty,
                recipient_email: recipientEmail,
                event,
                contract_type: contractType,
                three_party_stage: threePartyStage,
              },
            })
        }
        break
      }

      case 'DOCUMENT_SIGNED':
      case 'document.signed': {
        // Individual recipient signed - record the event
        const signerParty = threePartyStage || getPartyFromEmail(recipientEmail)
        console.log(`Document signed by ${signerParty || 'unknown'} (${recipientEmail})`)

        // Record the signed event with party info
        await adminSupabase
          .from('contract_status_history')
          .insert({
            contract_id: contractId,
            status: contract.status || 'sent',
            metadata: {
              action: 'recipient_signed',
              party: signerParty,
              recipient_email: recipientEmail,
              event,
              contract_type: contractType,
              three_party_stage: threePartyStage,
            },
          })
        break
      }

      case 'DOCUMENT_COMPLETED':
      case 'document.completed':
        // Document completed - handle differently for three-party contracts
        console.log('DOCUMENT_COMPLETED: isThreePartyContract=', isThreePartyContract, 'threePartyStage=', threePartyStage)

        if (isThreePartyContract && threePartyStage === 'seller') {
          // Seller's document completed - move to 'seller_signed' status
          // User can now send the buyer document
          const sellerSignedAt = payload.recipients?.[0]?.signedAt || new Date().toISOString()
          newStatus = 'seller_signed'
          updateData = {
            status: 'seller_signed',
            // Store seller signed date in custom_fields for later use
            custom_fields: {
              ...customFields,
              seller_signed_at: sellerSignedAt,
            },
          }
          additionalMetadata = {
            action: 'seller_document_completed',
            party: 'seller',
            three_party_stage: 'seller',
            next_step: 'send_to_buyer',
            seller_signed_at: sellerSignedAt,
          }
          console.log('Three-party: Seller signed, waiting for buyer document to be sent')

          // Send email to seller: "We got your signature, waiting for buyer"
          // Only for 3-party contracts
          if (contract.seller_email) {
            try {
              const propertyAddress = (customFields?.property_address as string) || 'the property'

              // Get company name
              const { data: companyData } = await adminSupabase
                .from('companies')
                .select('name')
                .eq('id', contract.company_id)
                .single()

              await sendSellerSignedEmail({
                to: contract.seller_email,
                sellerName: contract.seller_name || 'Seller',
                propertyAddress,
                companyName: companyData?.name || 'REI Sign',
              })
              console.log('[Webhook] Sent seller signed confirmation email')
            } catch (emailErr) {
              console.error('[Webhook] Failed to send seller signed email:', emailErr)
            }
          }
        } else if (isThreePartyContract && threePartyStage === 'buyer') {
          // Buyer's document completed - contract is fully complete
          newStatus = 'completed'
          updateData = {
            status: 'completed',
            completed_at: new Date().toISOString(),
          }
          additionalMetadata = {
            action: 'buyer_document_completed',
            party: 'buyer',
            three_party_stage: 'buyer',
          }
          console.log('Three-party: Buyer signed, contract complete')
        } else {
          // Standard single-document contract completed
          newStatus = 'completed'
          updateData = {
            status: 'completed',
            completed_at: new Date().toISOString(),
          }
          additionalMetadata = {
            action: 'document_completed',
          }
        }
        break

      case 'DOCUMENT_REJECTED':
      case 'document.rejected':
        // A recipient rejected the document
        newStatus = 'cancelled'
        updateData = {
          status: 'cancelled',
        }
        additionalMetadata = {
          action: 'document_rejected',
          party: threePartyStage || getPartyFromEmail(recipientEmail),
          recipient_email: recipientEmail,
          three_party_stage: threePartyStage,
        }
        break

      default:
        console.log('Unhandled event type:', event)
    }

    // Update contract if status changed
    if (newStatus && Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminSupabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId)

      if (updateError) {
        console.error('Failed to update contract:', updateError)
      } else {
        // Record status change in history with party info
        await adminSupabase
          .from('contract_status_history')
          .insert({
            contract_id: contractId,
            status: newStatus,
            metadata: {
              action: 'webhook_update',
              event,
              contract_type: contractType,
              documenso_payload: payload,
              three_party_stage: threePartyStage,
              ...additionalMetadata,
            },
          })

        console.log(`Contract ${contractId} status updated to ${newStatus}`)

        // Send email notification when contract is fully completed
        if (newStatus === 'completed') {
          try {
            console.log(`[Webhook] Contract completed, sending email notifications`)

            // Get full contract details with property
            const { data: fullContract } = await adminSupabase
              .from('contracts')
              .select(`
                *,
                property:properties(address, city, state, zip)
              `)
              .eq('id', contractId)
              .single()

            if (fullContract && fullContract.company_id) {
              // Get managers of the company
              const { data: managers } = await adminSupabase
                .from('users')
                .select('email')
                .eq('company_id', fullContract.company_id)
                .eq('role', 'manager')

              // Get the user who created/sent the contract (from status history)
              const { data: sentHistory } = await adminSupabase
                .from('contract_status_history')
                .select('changed_by')
                .eq('contract_id', contractId)
                .eq('status', 'sent')
                .order('created_at', { ascending: true })
                .limit(1)
                .single()

              let senderEmail: string | null = null
              if (sentHistory?.changed_by) {
                const { data: sender } = await adminSupabase
                  .from('users')
                  .select('email, role')
                  .eq('id', sentHistory.changed_by)
                  .single()
                // Only include sender if they're not already a manager
                if (sender && sender.role !== 'manager') {
                  senderEmail = sender.email
                }
              }

              // Collect all email recipients
              const emailRecipients: string[] = []

              // Helper to check if email is valid (not a test/dev email)
              const isValidEmail = (email: string): boolean => {
                // Filter out .local domains (test/dev emails)
                if (email.endsWith('.local')) return false
                // Filter out localhost emails
                if (email.includes('@localhost')) return false
                return true
              }

              // Add signers (seller and buyer/assignee)
              if (fullContract.seller_email && isValidEmail(fullContract.seller_email)) {
                emailRecipients.push(fullContract.seller_email)
              }
              if (fullContract.buyer_email && isValidEmail(fullContract.buyer_email) && !emailRecipients.includes(fullContract.buyer_email)) {
                emailRecipients.push(fullContract.buyer_email)
              }

              // Add managers
              if (managers) {
                managers.forEach(m => {
                  if (m.email && !emailRecipients.includes(m.email) && isValidEmail(m.email)) {
                    emailRecipients.push(m.email)
                  }
                })
              }

              // Add sender if not a manager
              if (senderEmail && !emailRecipients.includes(senderEmail) && isValidEmail(senderEmail)) {
                emailRecipients.push(senderEmail)
              }

              if (emailRecipients.length > 0) {
                // Try to download the signed PDF
                let pdfBuffer: Buffer | undefined
                const customFieldsEmail = fullContract.custom_fields as {
                  documenso_buyer_document_id?: string
                  documenso_seller_document_id?: string
                  property_address?: string
                  company_template_id?: string
                  seller_signed_at?: string
                } | null

                // For three-party, use buyer doc (has both signatures), otherwise use main doc
                const docIdForEmail = customFieldsEmail?.documenso_buyer_document_id ||
                                     customFieldsEmail?.documenso_seller_document_id ||
                                     fullContract.documenso_document_id

                if (docIdForEmail) {
                  try {
                    pdfBuffer = await documenso.downloadSignedDocumentBuffer(docIdForEmail)
                    console.log(`[Webhook] Downloaded signed PDF for email: ${pdfBuffer.length} bytes`)
                  } catch (downloadErr) {
                    console.error('[Webhook] Failed to download signed PDF for email:', downloadErr)
                  }
                }

                const propertyAddress = customFieldsEmail?.property_address ||
                                       (fullContract.property ? `${fullContract.property.address}, ${fullContract.property.city}, ${fullContract.property.state}` : 'Property')

                await sendSignedContractEmail({
                  to: emailRecipients,
                  contractId,
                  propertyAddress,
                  sellerName: fullContract.seller_name || 'Seller',
                  buyerName: fullContract.buyer_name || 'Buyer',
                  completedAt: fullContract.completed_at || new Date().toISOString(),
                  pdfBuffer,
                })
              }
            }
          } catch (emailError) {
            // Don't fail the webhook if email fails
            console.error('[Webhook] Failed to send completion email:', emailError)
          }
        }
      }
    }

    return NextResponse.json({ received: true, status: newStatus })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for webhook verification (some services require this)
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'documenso-webhook' })
}
