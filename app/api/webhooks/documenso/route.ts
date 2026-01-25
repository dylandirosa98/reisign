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
    // New format: "contract::{uuid}::{type}" (using :: as separator)
    // Old format: "contract-{uuid}-{type}" (still supported for existing documents)
    const externalId = payload.externalId
    if (!externalId?.startsWith('contract')) {
      console.log('Webhook not for a contract, ignoring')
      return NextResponse.json({ received: true })
    }

    let contractId: string
    let contractType: string

    if (externalId.includes('::')) {
      // New format: "contract::{uuid}::{type}"
      const parts = externalId.split('::')
      contractId = parts[1]
      contractType = parts[2] // 'purchase' or 'assignment'
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

    console.log('Parsed contract ID:', contractId, 'Type:', contractType)

    const adminSupabase = createAdminClient()

    // Find the contract
    const { data: contract, error: findError } = await adminSupabase
      .from('contracts')
      .select('id, status, company_id, documenso_document_id, seller_email, buyer_email')
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
      case 'document.opened': {
        // Recipient opened the document
        const viewerParty = getPartyFromEmail(recipientEmail)
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
              },
            })
        }
        break
      }

      case 'DOCUMENT_SIGNED':
      case 'document.signed': {
        // Individual recipient signed - record the event
        const signerParty = getPartyFromEmail(recipientEmail)
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
            },
          })
        break
      }

      case 'DOCUMENT_COMPLETED':
      case 'document.completed':
        // All recipients have signed - document is complete
        newStatus = 'completed'
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
        }
        additionalMetadata = {
          action: 'document_completed',
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
          party: getPartyFromEmail(recipientEmail),
          recipient_email: recipientEmail,
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
