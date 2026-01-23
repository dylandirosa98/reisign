import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PlanTier } from '@/lib/plans'

// GET - Get current user's company settings
export async function GET() {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with company
    const { data: userData } = await adminSupabase
      .from('users')
      .select('id, email, full_name, role, company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 })
    }

    // Get company settings
    const { data: company, error: companyError } = await adminSupabase
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
        overage_behavior
      `)
      .eq('id', userData.company_id)
      .single()

    if (companyError) {
      console.error('Error fetching company:', companyError)
      return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
    }

    // Get user count
    const { count: userCount } = await adminSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', userData.company_id)

    return NextResponse.json({
      user: userData,
      company: {
        ...company,
        overage_behavior: company.overage_behavior || 'warn_each',
      },
      userCount: userCount || 1,
    })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update company settings
export async function PATCH(request: Request) {
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

    // Only managers can update settings
    if (userData.role !== 'manager' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Only managers can update settings' }, { status: 403 })
    }

    const body = await request.json()
    const { overage_behavior, company_name } = body

    // Build update object
    const updates: Record<string, unknown> = {}

    if (overage_behavior && ['auto_charge', 'warn_each'].includes(overage_behavior)) {
      updates.overage_behavior = overage_behavior
    }

    if (company_name && company_name.trim()) {
      updates.name = company_name.trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { error: updateError } = await adminSupabase
      .from('companies')
      .update(updates)
      .eq('id', userData.company_id)

    if (updateError) {
      console.error('Error updating company:', updateError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
