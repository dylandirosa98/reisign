import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'

// POST /api/contracts/[id]/send-to-assignee - Send contract to assignee after seller has signed
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

  // Get contract with custom_fields
  const { data: contract, error: contractError } = await adminSupabase
    .from('contracts')
    .select('id, status, documenso_document_id, custom_fields, buyer_name, buyer_email')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (!contract.documenso_document_id) {
    return NextResponse.json({ error: 'Contract has not been sent yet' }, { status: 400 })
  }

  // Check for pending assignee
  const customFields = contract.custom_fields as {
    pending_assignee?: {
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
  } | null

  const pendingAssignee = customFields?.pending_assignee

  if (!pendingAssignee) {
    return NextResponse.json({
      error: 'No pending assignee found. Either the assignee has already been added, or this is not a sequential signing contract.'
    }, { status: 400 })
  }

  try {
    const documentId = parseInt(contract.documenso_document_id)

    console.log('[Send to Assignee] Adding assignee:', pendingAssignee.email)

    // Add assignee as recipient
    const addedRecipient = await documenso.addRecipient(documentId, {
      name: pendingAssignee.name,
      email: pendingAssignee.email,
      role: 'SIGNER',
      signingOrder: 2,
    })

    console.log('[Send to Assignee] Added recipient:', addedRecipient.id)

    // Add assignee's signature fields
    let fieldsAdded = 0
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
        fieldsAdded++
        console.log(`[Send to Assignee] Added ${fieldType} field on page ${field.page}`)
      } catch (fieldError) {
        console.error(`[Send to Assignee] Failed to add field:`, fieldError)
      }
    }

    console.log(`[Send to Assignee] Added ${fieldsAdded} fields`)

    // Send to assignee
    await documenso.resendToRecipients(documentId, [addedRecipient.id])
    console.log('[Send to Assignee] Sent signing request to assignee')

    // Clear pending assignee from contract
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedCustomFields: any = { ...(customFields || {}) }
    delete updatedCustomFields.pending_assignee
    await adminSupabase
      .from('contracts')
      .update({ custom_fields: updatedCustomFields })
      .eq('id', id)

    // Record in history
    await adminSupabase
      .from('contract_status_history')
      .insert({
        contract_id: id,
        status: contract.status || 'sent',
        changed_by: user.id,
        metadata: {
          action: 'sent_to_assignee',
          party: 'assignee',
          assignee_email: pendingAssignee.email,
          assignee_name: pendingAssignee.name,
          fields_added: fieldsAdded,
        },
      })

    return NextResponse.json({
      success: true,
      message: `Contract sent to assignee (${pendingAssignee.email})`,
      assignee: {
        name: pendingAssignee.name,
        email: pendingAssignee.email,
      },
    })
  } catch (error) {
    console.error('[Send to Assignee] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send to assignee' },
      { status: 500 }
    )
  }
}
