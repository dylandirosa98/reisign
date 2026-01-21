import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS, PlanTier } from '@/lib/plans'

// POST - Change plan (TEST MODE - no actual payment)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company and check role
    const { data: userData } = await adminSupabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Only managers can change plan
    if (userData.role !== 'manager' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Only managers can change plans' }, { status: 403 })
    }

    const body = await request.json()
    const { planId } = body as { planId: PlanTier }

    // Validate plan
    if (!planId || !PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Don't allow changing to admin plan
    if (planId === 'admin') {
      return NextResponse.json({ error: 'Admin plan cannot be selected' }, { status: 400 })
    }

    // Update the plan (TEST MODE - in production this would go through Stripe)
    const { error: updateError } = await adminSupabase
      .from('companies')
      .update({
        billing_plan: planId,
        actual_plan: planId,
        updated_at: new Date().toISOString(),
        // Reset period on plan change
        billing_period_start: new Date().toISOString(),
        contracts_used_this_period: 0,
      })
      .eq('id', userData.company_id)

    if (updateError) {
      console.error('Error updating plan:', updateError)
      return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Plan changed to ${PLANS[planId].name} (TEST MODE - no payment processed)`,
      plan: planId,
    })
  } catch (error) {
    console.error('Plan change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
