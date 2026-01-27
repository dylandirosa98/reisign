import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/properties/[id]/status - Update property status
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

  const body = await request.json()
  const { status } = body

  // Validate status
  const validStatuses = ['none', 'in_escrow', 'terminated', 'pending', 'closed']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Update property status (only if it belongs to user's company)
  const { data, error } = await adminSupabase
    .from('properties')
    .update({ status })
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update property status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, property: data })
}
