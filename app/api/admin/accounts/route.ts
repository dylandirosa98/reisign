import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateBillingDetails, daysUntilNextBilling, type BillingCycle } from '@/lib/billing'
import { type PlanTier } from '@/lib/plans'

export async function GET() {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is system admin
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_system_admin, role')
      .eq('id', user.id)
      .single()

    if (!userData?.is_system_admin && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all companies with billing info
    const { data: companies, error: companiesError } = await adminSupabase
      .from('companies')
      .select(`
        id,
        name,
        billing_plan,
        actual_plan,
        contracts_used_this_period,
        billing_period_start,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }

    // Fetch detailed info for each company
    const companiesWithDetails = await Promise.all(
      (companies || []).map(async (company) => {
        // Get users
        const { data: users } = await adminSupabase
          .from('users')
          .select('id, email, full_name, role, is_system_admin')
          .eq('company_id', company.id)

        // Get total contract count
        const { count: totalContractCount } = await adminSupabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)

        // Get billing history
        const { data: billingHistory } = await (adminSupabase.from as any)('billing_cycles')
          .select('*')
          .eq('company_id', company.id)
          .order('cycle_start', { ascending: false })
          .limit(12)

        const billingPlan = (company.billing_plan || 'free') as PlanTier
        const actualPlan = (company.actual_plan || 'free') as PlanTier
        const billingInterval = 'monthly' as 'monthly' | 'yearly'
        const usersCount = users?.length || 0
        const contractsUsed = company.contracts_used_this_period || 0

        // Calculate billing details
        const billing = calculateBillingDetails(
          billingPlan,
          actualPlan,
          billingInterval,
          contractsUsed,
          usersCount,
          company.billing_period_start ? new Date(company.billing_period_start) : null,
          null
        )

        return {
          id: company.id,
          name: company.name,
          createdAt: company.created_at,
          subscriptionStatus: company.subscription_status || 'active',
          stripeCustomerId: company.stripe_customer_id,
          stripeSubscriptionId: company.stripe_subscription_id,

          // Users
          users: users || [],
          usersCount,

          // Contracts
          totalContracts: totalContractCount || 0,

          // Billing details
          billing: {
            ...billing,
            daysUntilNextBilling: daysUntilNextBilling(null),
          },

          // Billing history
          billingHistory: (billingHistory || []).map((cycle: any): BillingCycle => ({
            id: cycle.id,
            cycleStart: new Date(cycle.cycle_start),
            cycleEnd: new Date(cycle.cycle_end),
            planAtCycleStart: cycle.plan_at_cycle_start,
            baseAmount: cycle.base_amount,
            extraSeatsCount: cycle.extra_seats_count,
            extraSeatsAmount: cycle.extra_seats_amount,
            extraContractsCount: cycle.extra_contracts_count,
            extraContractsAmount: cycle.extra_contracts_amount,
            totalAmount: cycle.total_amount,
            status: cycle.status,
            paidAt: cycle.paid_at ? new Date(cycle.paid_at) : null,
          })),
        }
      })
    )

    return NextResponse.json(companiesWithDetails)
  } catch (error) {
    console.error('Admin accounts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is system admin
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_system_admin, role')
      .eq('id', user.id)
      .single()

    if (!userData?.is_system_admin && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { companyId, billing_plan, actual_plan } = body

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const { error } = await adminSupabase
      .from('companies')
      .update({
        billing_plan,
        actual_plan,
      })
      .eq('id', companyId)

    if (error) {
      console.error('Error updating company:', error)
      return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin accounts update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
