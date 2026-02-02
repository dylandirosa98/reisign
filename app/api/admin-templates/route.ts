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

// GET /api/admin-templates - List all admin templates
export async function GET() {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const adminSupabase = createAdminClient()

  const { data: templates, error } = await adminSupabase
    .from('admin_templates')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(templates)
}

// POST /api/admin-templates - Create a new admin template
export async function POST(request: NextRequest) {
  const user = await verifyAdminAccess()
  if (!user) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { name, description, html_content, signature_layout } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  const { data: template, error } = await adminSupabase
    .from('admin_templates')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      html_content: html_content || '',
      signature_layout: signature_layout || 'two-column',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(template)
}
