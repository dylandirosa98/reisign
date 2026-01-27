import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const adminSupabase = createAdminClient()
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Find the invite and verify it's valid
    const { data: invite, error: inviteError } = await adminSupabase
      .from('invites')
      .select('id, email, expires_at, accepted_at')
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
    }

    if (invite.accepted_at) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    // Find the user by email in Supabase Auth
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return NextResponse.json({ error: 'Failed to find user' }, { status: 500 })
    }

    const authUser = users.find(u => u.email?.toLowerCase() === invite.email.toLowerCase())

    if (!authUser) {
      return NextResponse.json({ error: 'User not found. Please contact support.' }, { status: 404 })
    }

    // Update the user's password using admin API
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      authUser.id,
      { password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: invite.email })
  } catch (error) {
    console.error('Setup password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
