import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAdminNotification } from '@/lib/services/email'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyName } = body

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Check if user already has a company
    const { data: existingUser } = await adminSupabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (existingUser?.company_id) {
      return NextResponse.json({ error: 'You already have a company' }, { status: 400 })
    }

    // Create company using admin client to bypass RLS
    const { data: company, error: companyError } = await adminSupabase
      .from('companies')
      .insert({
        name: companyName.trim(),
        billing_plan: 'free',
        actual_plan: 'free',
        billing_period_start: new Date().toISOString(),
        contracts_used_this_period: 0,
        subscription_status: 'active',
      })
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError)
      return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    }

    // Update user with company_id and set as manager
    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        company_id: company.id,
        role: 'manager',
      })
      .eq('id', user.id)

    if (userError) {
      console.error('User update error:', userError)
      // Try to clean up the company
      await adminSupabase.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: 'Failed to link company to user' }, { status: 500 })
    }

    // Notify admin of new signup
    sendAdminNotification({
      subject: `New Signup: ${companyName.trim()}`,
      event: 'New User Signup',
      details: {
        'Company': companyName.trim(),
        'Email': user.email || 'Unknown',
        'Date': new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
      },
    }).catch(() => {}) // Fire and forget

    return NextResponse.json({ success: true, companyId: company.id })
  } catch (error) {
    console.error('Onboarding error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
