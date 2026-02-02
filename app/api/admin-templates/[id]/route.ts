import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verifyAdminAccess() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await adminSupabase
    .from('users')
    .select('role, is_system_admin')
    .eq('id', user.id)
    .single()

  if (!userData?.is_system_admin && userData?.role !== 'admin') return null
  return user
}

// GET /api/admin-templates/[id] - Get a single admin template with overrides
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const adminSupabase = createAdminClient()

  const { data: template, error } = await adminSupabase
    .from('admin_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Fetch overrides for this template
  const { data: overrides } = await adminSupabase
    .from('admin_template_overrides')
    .select('*')
    .eq('admin_template_id', id)
    .order('state_code', { ascending: true })

  return NextResponse.json({ ...template, overrides: overrides || [] })
}

// PATCH /api/admin-templates/[id] - Update an admin template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const { name, description, html_content, signature_layout, is_active, sort_order } = body

  const adminSupabase = createAdminClient()

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name.trim()
  if (description !== undefined) updateData.description = description?.trim() || null
  if (html_content !== undefined) updateData.html_content = html_content
  if (signature_layout !== undefined) updateData.signature_layout = signature_layout
  if (is_active !== undefined) updateData.is_active = is_active
  if (sort_order !== undefined) updateData.sort_order = sort_order

  const { data: template, error } = await adminSupabase
    .from('admin_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(template)
}

// DELETE /api/admin-templates/[id] - Soft-delete (deactivate) an admin template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('admin_templates')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
