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

// GET /api/admin-templates/[id]/overrides - List all state overrides for a template
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

  const { data: overrides, error } = await adminSupabase
    .from('admin_template_overrides')
    .select('*')
    .eq('admin_template_id', id)
    .order('state_code', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(overrides)
}
