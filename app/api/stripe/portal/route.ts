import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStripeConfigured, createPortalSession } from '@/lib/stripe'

export async function POST() {
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

    // Get company's Stripe customer ID
    const { data: companyData } = await adminSupabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', userData.company_id)
      .single()

    if (!companyData?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const returnUrl = `${baseUrl}/dashboard/settings/billing`

    const session = await createPortalSession(
      companyData.stripe_customer_id,
      returnUrl
    )

    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create portal session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
