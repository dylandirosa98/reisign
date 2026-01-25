import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

interface PendingAssignee {
  name: string
  email: string
  fields: Array<{
    page: number
    x: number
    y: number
    width: number
    height: number
    fieldType?: string
  }>
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

    // Extract contract ID from externalId (format: "contract-{uuid}-{type}")
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const externalId = payload.externalId
    if (!externalId?.startsWith('contract-')) {
      console.log('Webhook not for a contract, ignoring')
      return NextResponse.json({ received: true })
    }

    // Parse: "contract-d518d472-9360-4fdd-9d09-b7348a48d9af-purchase"
    // Remove "contract-" prefix, then extract the last part as type
    const withoutPrefix = externalId.replace('contract-', '')
    const lastDashIndex = withoutPrefix.lastIndexOf('-')
    const contractId = withoutPrefix.substring(0, lastDashIndex)
    const contractType = withoutPrefix.substring(lastDashIndex + 1) // 'purchase' or 'assignment'

    if (!contractId) {
      console.log('Invalid externalId format')
      return NextResponse.json({ received: true })
    }

    console.log('Parsed contract ID:', contractId, 'Type:', contractType)

    const adminSupabase = createAdminClient()

    // Find the contract with custom_fields for pending assignee
    const { data: contract, error: findError } = await adminSupabase
      .from('contracts')
      .select('id, status, company_id, documenso_document_id, custom_fields, seller_email, buyer_email')
      .eq('id', contractId)
      .single()

    if (findError || !contract) {
      console.log('Contract not found:', contractId)
      return NextResponse.json({ received: true })
    }

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
      case 'document.opened':
        // Recipient opened the document
        if (contract.status === 'sent') {
          newStatus = 'viewed'
          updateData = {
            status: 'viewed',
            viewed_at: new Date().toISOString(),
          }
          additionalMetadata = {
            party: getPartyFromEmail(recipientEmail),
            recipient_email: recipientEmail,
          }
        }
        break

      case 'DOCUMENT_SIGNED':
      case 'document.signed':
        // Individual recipient signed - record and check if we need to add assignee
        console.log('Document signed by recipient:', recipientEmail)

        // Record the signed event with party info
        const signerParty = getPartyFromEmail(recipientEmail)
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
            },
          })

        // Check for pending assignee (sequential signing)
        const customFields = contract.custom_fields as { pending_assignee?: PendingAssignee } | null
        const pendingAssignee = customFields?.pending_assignee

        if (pendingAssignee && contract.documenso_document_id) {
          console.log('[Webhook] Sequential signing: Adding assignee after seller signed')
          console.log('[Webhook] Pending assignee:', pendingAssignee.email)

          try {
            const documentId = parseInt(contract.documenso_document_id)

            // Add assignee as recipient
            const addedRecipient = await documenso.addRecipient(documentId, {
              name: pendingAssignee.name,
              email: pendingAssignee.email,
              role: 'SIGNER',
              signingOrder: 2,
            })

            console.log('[Webhook] Added assignee recipient:', addedRecipient.id)

            // Add assignee's signature fields
            for (const field of pendingAssignee.fields) {
              const fieldType = field.fieldType === 'initials' ? 'INITIALS' : 'SIGNATURE'
              try {
                await documenso.addSignatureField(documentId, addedRecipient.id, {
                  page: field.page,
                  x: field.x,
                  y: field.y,
                  width: field.width,
                  height: field.height,
                  type: fieldType,
                })
                console.log(`[Webhook] Added ${fieldType} field for assignee on page ${field.page}`)
              } catch (fieldError) {
                console.error(`[Webhook] Failed to add field:`, fieldError)
              }
            }

            // Send to assignee (resend triggers email to new recipient)
            await documenso.resendToRecipients(documentId, [addedRecipient.id])
            console.log('[Webhook] Sent signing request to assignee')

            // Clear pending assignee from contract
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedCustomFields: any = { ...(customFields || {}) }
            delete updatedCustomFields.pending_assignee
            await adminSupabase
              .from('contracts')
              .update({ custom_fields: updatedCustomFields })
              .eq('id', contractId)

            // Record in history
            await adminSupabase
              .from('contract_status_history')
              .insert({
                contract_id: contractId,
                status: contract.status || 'sent',
                metadata: {
                  action: 'assignee_added_after_seller_signed',
                  assignee_email: pendingAssignee.email,
                  assignee_recipient_id: addedRecipient.id,
                },
              })

            console.log('[Webhook] Sequential signing: Assignee added successfully')
          } catch (error) {
            console.error('[Webhook] Failed to add assignee:', error)
          }
        }
        break

      case 'DOCUMENT_COMPLETED':
      case 'document.completed':
        // All recipients have signed - document is complete
        newStatus = 'completed'
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
        }
        break

      case 'DOCUMENT_REJECTED':
      case 'document.rejected':
        // A recipient rejected the document
        newStatus = 'cancelled'
        updateData = {
          status: 'cancelled',
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
