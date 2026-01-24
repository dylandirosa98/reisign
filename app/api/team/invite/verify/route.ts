import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  // Find the invite
  const { data: invite, error } = await adminSupabase
    .from('invites')
    .select(`
      id,
      email,
      role,
      expires_at,
      accepted_at,
      company:companies(id, name)
    `)
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
  }

  const company = invite.company as { id: string; name: string } | null

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    company_id: company?.id,
    company_name: company?.name || 'Unknown Company',
  })
}
