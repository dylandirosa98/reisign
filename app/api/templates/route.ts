import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/templates - Get all state templates (admin only)
export async function GET() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  // Verify user is authenticated and is an admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  // Get all state templates ordered by general first, then alphabetical
  const { data: templates, error } = await adminSupabase
    .from('state_templates')
    .select('*')
    .order('is_general', { ascending: false })
    .order('state_name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(templates)
}
