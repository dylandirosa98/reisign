import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStripeConfigured, createCheckoutSession } from '@/lib/stripe'
import { type PlanTier } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { planId, billingInterval = 'monthly', endorselyReferral } = body as {
      planId: PlanTier
      billingInterval?: 'monthly' | 'yearly'
      endorselyReferral?: string | null
    }

    if (!planId || !['free', 'individual', 'team', 'business'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Get user's company
    const adminSupabase = createAdminClient()
    const { data: userData } = await adminSupabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json(
        { error: 'No company found' },
        { status: 400 }
      )
    }

    // Get company's Stripe customer ID if exists
    const { data: companyData } = await adminSupabase
      .from('companies')
      .select('stripe_customer_id, name')
      .eq('id', userData.company_id)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const successUrl = `${baseUrl}/dashboard/settings/billing?success=true`
    const cancelUrl = `${baseUrl}/dashboard/settings/billing?canceled=true`

    const session = await createCheckoutSession(
      companyData?.stripe_customer_id || null,
      userData.company_id,
      planId,
      billingInterval,
      successUrl,
      cancelUrl,
      endorselyReferral || undefined
    )

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
