import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addExtraSeat, isStripeConfigured } from '@/lib/stripe'
import { canAddTeamMember, PLANS, type PlanTier } from '@/lib/plans'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find and validate the invite
    const { data: invite, error: inviteError } = await adminSupabase
      .from('invites')
      .select(`
        id,
        email,
        role,
        company_id,
        expires_at,
        accepted_at,
        company:companies(id, name, actual_plan, stripe_subscription_id)
      `)
      .eq('token', token)
      .single()

    if (inviteError || !invite) {
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

    // Verify email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'This invite was sent to a different email address' }, { status: 400 })
    }

    const company = invite.company as { id: string; name: string; actual_plan: string; stripe_subscription_id: string | null } | null

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if company can add more members
    const { data: existingMembers } = await adminSupabase
      .from('users')
      .select('id')
      .eq('company_id', company.id)

    const memberCount = existingMembers?.length || 0
    const planCheck = canAddTeamMember(company.actual_plan as PlanTier || 'free', memberCount)

    if (!planCheck.allowed) {
      return NextResponse.json({ error: planCheck.reason }, { status: 403 })
    }

    // Check if this will be an overage seat
    const isOverageSeat = planCheck.overagePrice !== undefined

    // Update the user record to link to company
    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        company_id: company.id,
        role: invite.role || 'user',
        full_name: user.user_metadata?.full_name || null,
        is_active: true,
      })
      .eq('id', user.id)

    if (userError) {
      console.error('User update error:', userError)
      return NextResponse.json({ error: 'Failed to join company' }, { status: 500 })
    }

    // Mark invite as accepted
    await adminSupabase
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    // Charge for extra seat if this is an overage
    let seatChargeAdded = false
    const actualPlan = (company.actual_plan || 'free') as PlanTier
    if (isOverageSeat && company.stripe_subscription_id && isStripeConfigured()) {
      const seatResult = await addExtraSeat(company.stripe_subscription_id, actualPlan)
      seatChargeAdded = !!seatResult
      if (seatResult) {
        console.log(`[Invite Accept] Extra seat added to subscription: ${seatResult.id}`)
      }
    }

    // Get seat price for response
    const plan = PLANS[actualPlan]
    const seatPrice = plan.limits.overagePricing.extraSeatPrice

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
      },
      billing: {
        isOverageSeat,
        seatChargeAdded,
        monthlyCharge: isOverageSeat ? `$${(seatPrice / 100).toFixed(0)}/month` : null,
      },
    })
  } catch (error) {
    console.error('Invite accept error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
