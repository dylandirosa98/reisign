import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'

// POST /api/contracts/[id]/resend - Resend signing request to recipients
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  // Get contract
  const { data: contract, error: contractError } = await adminSupabase
    .from('contracts')
    .select('id, documenso_document_id, status')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (!contract.documenso_document_id) {
    return NextResponse.json({ error: 'Contract has not been sent yet' }, { status: 400 })
  }

  if (contract.status === 'completed') {
    return NextResponse.json({ error: 'Contract has already been completed' }, { status: 400 })
  }

  try {
    // Get current document status to find recipients who haven't signed
    const docStatus = await documenso.getDocumentStatus(contract.documenso_document_id)

    // Get body to check if specific recipients are requested
    const body = await request.json().catch(() => ({}))
    const requestedRecipientIds = body.recipientIds as number[] | undefined

    // Find recipients to resend to (either specified or all unsigned)
    let recipientsToResend: number[]
    if (requestedRecipientIds && requestedRecipientIds.length > 0) {
      recipientsToResend = requestedRecipientIds
    } else {
      // Resend to all recipients who haven't signed
      recipientsToResend = docStatus.recipients
        .filter(r => r.signingStatus !== 'SIGNED')
        .map(r => r.id)
    }

    if (recipientsToResend.length === 0) {
      return NextResponse.json({
        error: 'All recipients have already signed',
        message: 'No recipients need a reminder'
      }, { status: 400 })
    }

    // Resend to the recipients
    await documenso.resendToRecipients(contract.documenso_document_id, recipientsToResend)

    // Record in status history
    await adminSupabase
      .from('contract_status_history')
      .insert({
        contract_id: id,
        status: contract.status || 'sent',
        changed_by: user.id,
        metadata: {
          action: 'resend_signing_request',
          recipient_ids: recipientsToResend,
          recipients_resent: recipientsToResend.length,
        },
      })

    return NextResponse.json({
      success: true,
      message: `Resent signing request to ${recipientsToResend.length} recipient(s)`,
      recipientsResent: recipientsToResend.length,
    })
  } catch (error) {
    console.error('Failed to resend contract:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend contract' },
      { status: 500 }
    )
  }
}
