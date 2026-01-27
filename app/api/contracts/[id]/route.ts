import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/contracts/[id] - Get a single contract
export async function GET(
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

  // Get user's company and role
  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const typedUserData = userData as { company_id: string | null; role: string | null } | null

  if (!typedUserData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  const userRole = typedUserData.role
  const isManager = userRole === 'manager' || userRole === 'admin'

  // Get contract with property
  const { data: contract, error } = await adminSupabase
    .from('contracts')
    .select(`
      *,
      property:properties(id, address, city, state, zip)
    `)
    .eq('id', id)
    .eq('company_id', typedUserData.company_id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Get status history
  const { data: history } = await adminSupabase
    .from('contract_status_history')
    .select('*')
    .eq('contract_id', id)
    .order('created_at', { ascending: false })

  // Get the template used for this contract (if any)
  let template = null
  const customFields = contract.custom_fields as Record<string, unknown> | null
  const companyTemplateId = customFields?.company_template_id as string | undefined

  if (companyTemplateId) {
    const { data: templateData } = await adminSupabase
      .from('company_templates' as any)
      .select('id, name, signature_layout, field_config, custom_fields')
      .eq('id', companyTemplateId)
      .single()

    if (templateData) {
      template = templateData
    }
  }

  return NextResponse.json({
    contract,
    history: history || [],
    template,
    userRole,
    isManager,
  })
}

// PATCH /api/contracts/[id] - Update a contract
export async function PATCH(
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

  // Check contract exists and belongs to company
  const { data: existingContract } = await adminSupabase
    .from('contracts')
    .select('id, status')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (!existingContract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  const body = await request.json()
  const allowedFields = [
    'buyer_name',
    'buyer_email',
    'seller_name',
    'seller_email',
    'price',
    'custom_fields',
  ]

  // Only allow updates if contract is in draft or ready status
  if (existingContract.status !== 'draft' && existingContract.status !== 'ready') {
    console.log(`[PATCH /api/contracts/${id}] Rejecting update - status is: ${existingContract.status}`)
    return NextResponse.json({
      error: `Cannot modify a contract with status "${existingContract.status}". Only draft or ready contracts can be edited.`,
    }, { status: 400 })
  }

  // Filter to allowed fields
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Check if wholesaler signature is being added - if so, move from draft to ready
  const customFields = body.custom_fields as Record<string, unknown> | undefined
  const hasSignature = customFields?.buyer_signature && customFields?.buyer_initials
  if (existingContract.status === 'draft' && hasSignature) {
    updateData.status = 'ready'
  }

  const { data: updated, error } = await adminSupabase
    .from('contracts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contract: updated })
}

// DELETE /api/contracts/[id] - Delete a draft contract
export async function DELETE(
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

  // Check contract exists and is in draft status
  const { data: contract } = await adminSupabase
    .from('contracts')
    .select('id, status')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.status !== 'draft') {
    return NextResponse.json({
      error: 'Only draft contracts can be deleted',
    }, { status: 400 })
  }

  const { error } = await adminSupabase
    .from('contracts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
