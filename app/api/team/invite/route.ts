import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAddTeamMember, PLANS, type PlanTier } from '@/lib/plans'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ error: 'Only managers can invite team members' }, { status: 403 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate role
    const validRole = role === 'manager' ? 'manager' : 'user'

    // Check if user with this email already exists in the company
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('company_id', userData.company_id)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email is already in your team' }, { status: 400 })
    }

    // Check if there's already a pending invite
    const { data: existingInvite } = await adminSupabase
      .from('invites')
      .select('id')
      .eq('email', email)
      .eq('company_id', userData.company_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'An invite has already been sent to this email' }, { status: 400 })
    }

    // Check if company can add more members (plan limits)
    const { data: existingMembers } = await adminSupabase
      .from('users')
      .select('id')
      .eq('company_id', userData.company_id)

    const { data: company } = await adminSupabase
      .from('companies')
      .select('actual_plan, name, stripe_subscription_id')
      .eq('id', userData.company_id)
      .single()

    const memberCount = existingMembers?.length || 0
    const planCheck = canAddTeamMember(company?.actual_plan || 'free', memberCount)

    if (!planCheck.allowed) {
      return NextResponse.json({ error: planCheck.reason }, { status: 403 })
    }

    // Generate invite token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invite
    const { data: invite, error: inviteError } = await adminSupabase
      .from('invites')
      .insert({
        email,
        token,
        company_id: userData.company_id,
        invited_by: user.id,
        role: validRole,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Invite creation error:', inviteError)
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }

    // Send invite email via Supabase
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/signup?invite=${token}`

    // Use Supabase to send the invite email
    const { error: emailError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteUrl,
      data: {
        invited_to_company: userData.company_id,
        invited_role: validRole,
        invite_token: token,
        company_name: company?.name || 'Unknown Company',
      },
    })

    if (emailError) {
      // If email fails, still return success with the invite link (manager can share manually)
      console.error('Email send error:', emailError)
      return NextResponse.json({
        success: true,
        invite: {
          id: invite.id,
          email,
          role: validRole,
          expires_at: expiresAt.toISOString(),
        },
        inviteUrl,
        emailSent: false,
        message: 'Invite created but email failed to send. Share the invite link manually.',
      })
    }

    // Get overage info for response
    const isOverageSeat = planCheck.overagePrice !== undefined
    const actualPlan = (company?.actual_plan || 'free') as PlanTier
    const plan = PLANS[actualPlan]
    const seatPrice = plan.limits.overagePricing.extraSeatPrice

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email,
        role: validRole,
        expires_at: expiresAt.toISOString(),
      },
      inviteUrl,
      emailSent: true,
      billing: {
        isOverageSeat,
        monthlyCharge: isOverageSeat ? `$${(seatPrice / 100).toFixed(0)}/month` : null,
      },
    })
  } catch (error) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a pending invite
export async function DELETE(request: Request) {
  try {
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
      return NextResponse.json({ error: 'Only managers can delete invitations' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
    }

    // Verify the invite belongs to the user's company and is still pending
    const { data: invite, error: fetchError } = await adminSupabase
      .from('invites')
      .select('id, email')
      .eq('id', inviteId)
      .eq('company_id', userData.company_id)
      .is('accepted_at', null)
      .single()

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Delete the invite
    const { error: deleteError } = await adminSupabase
      .from('invites')
      .delete()
      .eq('id', inviteId)

    if (deleteError) {
      console.error('Delete invite error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedEmail: invite.email })
  } catch (error) {
    console.error('Delete invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - List pending invites
export async function GET() {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user's company
    const { data: userData } = await adminSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Get pending invites
    const { data: invites, error } = await adminSupabase
      .from('invites')
      .select('id, email, role, created_at, expires_at')
      .eq('company_id', userData.company_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Invites GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
