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

// GET /api/admin-templates/[id]/overrides/[stateCode] - Get override for a state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stateCode: string }> }
) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id, stateCode } = await params
  const adminSupabase = createAdminClient()

  // Check for state override
  const { data: override } = await adminSupabase
    .from('admin_template_overrides')
    .select('*')
    .eq('admin_template_id', id)
    .eq('state_code', stateCode.toUpperCase())
    .single()

  if (override) {
    return NextResponse.json({
      html: override.html_content,
      isOverride: true,
      stateCode: override.state_code,
    })
  }

  // No override — return base template content
  const { data: template } = await adminSupabase
    .from('admin_templates')
    .select('html_content')
    .eq('id', id)
    .single()

  return NextResponse.json({
    html: template?.html_content || '',
    isOverride: false,
    stateCode: stateCode.toUpperCase(),
  })
}

// PUT /api/admin-templates/[id]/overrides/[stateCode] - Upsert a state override
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stateCode: string }> }
) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id, stateCode } = await params
  const body = await request.json()
  const { html_content } = body

  if (html_content === undefined) {
    return NextResponse.json({ error: 'html_content is required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  const { data, error } = await adminSupabase
    .from('admin_template_overrides')
    .upsert(
      {
        admin_template_id: id,
        state_code: stateCode.toUpperCase(),
        html_content,
      },
      { onConflict: 'admin_template_id,state_code' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/admin-templates/[id]/overrides/[stateCode] - Remove a state override
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stateCode: string }> }
) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id, stateCode } = await params
  const adminSupabase = createAdminClient()

  const { error } = await adminSupabase
    .from('admin_template_overrides')
    .delete()
    .eq('admin_template_id', id)
    .eq('state_code', stateCode.toUpperCase())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
