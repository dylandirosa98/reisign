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
  // Verify webhook signature if secret is configured
  const signature = request.headers.get('x-documenso-secret')
  if (WEBHOOK_SECRET && signature !== WEBHOOK_SECRET) {
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

    // Find the contract
    const { data: contract, error: findError } = await adminSupabase
      .from('contracts')
      .select('id, status, company_id')
      .eq('id', contractId)
      .single()

    if (findError || !contract) {
      console.log('Contract not found:', contractId)
      return NextResponse.json({ received: true })
    }

    let newStatus: string | null = null
    let updateData: Record<string, unknown> = {}

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
        }
        break

      case 'DOCUMENT_SIGNED':
      case 'document.signed':
        // Individual recipient signed
        // We could track partial signatures here if needed
        console.log('Document signed by recipient')
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
        // Record status change in history
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
