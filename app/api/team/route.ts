import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canAddTeamMember, PLANS, type PlanTier } from '@/lib/plans'
import { addExtraSeat, isStripeConfigured } from '@/lib/stripe'

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

    // Get team members
    const { data: members, error } = await adminSupabase
      .from('users')
      .select('id, email, full_name, role, is_active, monthly_contract_limit, contracts_sent_this_period, created_at')
      .eq('company_id', userData.company_id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching team:', error)
      return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
    }

    // Get company plan info for limits
    const { data: company } = await adminSupabase
      .from('companies')
      .select('actual_plan, billing_plan')
      .eq('id', userData.company_id)
      .single()

    return NextResponse.json({
      members,
      currentUserRole: userData.role,
      companyPlan: company?.actual_plan || 'free',
    })
  } catch (error) {
    console.error('Team GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
      return NextResponse.json({ error: 'Only managers can add team members' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, full_name, role, monthly_contract_limit } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Validate role
    const validRole = role === 'manager' ? 'manager' : 'user'

    // Check if company can add more members (plan limits)
    const { data: existingMembers } = await adminSupabase
      .from('users')
      .select('id')
      .eq('company_id', userData.company_id)

    const { data: company } = await adminSupabase
      .from('companies')
      .select('actual_plan, stripe_customer_id, stripe_subscription_id')
      .eq('id', userData.company_id)
      .single()

    const memberCount = existingMembers?.length || 0
    const planCheck = canAddTeamMember(company?.actual_plan || 'free', memberCount)

    // Check if this is an overage seat
    const isOverageSeat = planCheck.allowed && planCheck.overagePrice !== undefined

    if (!planCheck.allowed) {
      return NextResponse.json({ error: planCheck.reason }, { status: 403 })
    }

    // Create auth user using admin client
    // Don't auto-confirm - user will receive confirmation email
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User must confirm via email
      user_metadata: {
        full_name: full_name || '',
        invited_to_company: userData.company_id,
        invited_role: validRole,
        monthly_contract_limit: monthly_contract_limit || null,
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      if (authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // Update user record created by trigger with company info
    // The trigger on auth.users automatically creates a basic user record
    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name: full_name || null,
        company_id: userData.company_id,
        role: validRole,
        is_active: true,
        monthly_contract_limit: monthly_contract_limit || null,
        contracts_sent_this_period: 0,
      })
      .eq('id', authData.user.id)

    if (userError) {
      console.error('User record error:', userError)
      // Try to clean up the auth user
      await adminSupabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
    }

    // Charge for extra seat if this is an overage
    let seatChargeAdded = false
    const actualPlan = (company?.actual_plan || 'free') as PlanTier
    if (isOverageSeat && company?.stripe_subscription_id && isStripeConfigured()) {
      const seatResult = await addExtraSeat(company.stripe_subscription_id, actualPlan)
      seatChargeAdded = !!seatResult
      if (seatResult) {
        console.log(`[Team] Extra seat added to subscription: ${seatResult.id}`)
      }
    }

    // Get the actual seat price for this plan
    const plan = PLANS[actualPlan]
    const seatPrice = plan.limits.overagePricing.extraSeatPrice

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        full_name,
        role: validRole,
        monthly_contract_limit,
      },
      billing: {
        isOverageSeat,
        seatChargeAdded,
        monthlyCharge: isOverageSeat ? `$${(seatPrice / 100).toFixed(0)}/month` : null,
      },
    })
  } catch (error) {
    console.error('Team POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
