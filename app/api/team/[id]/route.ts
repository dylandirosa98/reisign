import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's company and role
    const { data: userData } = await adminSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Check if user is manager
    if (userData.role !== 'manager' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Only managers can update team members' }, { status: 403 })
    }

    // Verify the member belongs to the same company
    const { data: member } = await adminSupabase
      .from('users')
      .select('id, company_id, role')
      .eq('id', memberId)
      .single()

    if (!member || member.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Can't demote yourself
    if (memberId === user.id) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
    }

    const body = await request.json()
    const { full_name, role, monthly_contract_limit, is_active } = body

    // Validate role
    const validRole = role === 'manager' ? 'manager' : 'user'

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (role !== undefined) updateData.role = validRole
    if (monthly_contract_limit !== undefined) updateData.monthly_contract_limit = monthly_contract_limit
    if (is_active !== undefined) updateData.is_active = is_active

    const { error } = await adminSupabase
      .from('users')
      .update(updateData)
      .eq('id', memberId)

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's company and role
    const { data: userData } = await adminSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Check if user is manager
    if (userData.role !== 'manager' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Only managers can remove team members' }, { status: 403 })
    }

    // Can't delete yourself
    if (memberId === user.id) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
    }

    // Verify the member belongs to the same company
    const { data: member } = await adminSupabase
      .from('users')
      .select('id, company_id, email')
      .eq('id', memberId)
      .single()

    if (!member || member.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Delete the user record first
    const { error: userError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', memberId)

    if (userError) {
      console.error('User delete error:', userError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Delete the auth user
    const { error: authError } = await adminSupabase.auth.admin.deleteUser(memberId)

    if (authError) {
      console.error('Auth delete error:', authError)
      // User record is already deleted, log but don't fail
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Team DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
