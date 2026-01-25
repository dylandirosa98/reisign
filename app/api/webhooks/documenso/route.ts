import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const body: DocumensoWebhookPayload = await request.json()
    const { event, payload } = body

    console.log('Documenso webhook received:', event, payload)

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
      .select('id, status, company_id, documenso_document_id, seller_email, buyer_email, custom_fields')
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

    const isThreePartyContract = hasSellerDocId || threePartyStage === 'seller' || threePartyStage === 'buyer'

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
          newStatus = 'seller_signed'
          updateData = {
            status: 'seller_signed',
          }
          additionalMetadata = {
            action: 'seller_document_completed',
            party: 'seller',
            three_party_stage: 'seller',
            next_step: 'send_to_buyer',
          }
          console.log('Three-party: Seller signed, waiting for buyer document to be sent')
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
