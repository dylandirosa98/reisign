import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStripeConfigured, getInvoices, getUpcomingInvoice } from '@/lib/stripe'

export async function GET() {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
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
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json(
        { error: 'No company found' },
        { status: 400 }
      )
    }

    // Only managers can view billing info
    if (userData.role !== 'manager' && userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only managers can view billing information' },
        { status: 403 }
      )
    }

    // Get company's Stripe customer ID
    const { data: companyData } = await adminSupabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', userData.company_id)
      .single()

    if (!companyData?.stripe_customer_id) {
      return NextResponse.json({
        invoices: [],
        upcomingInvoice: null,
      })
    }

    // Fetch invoices and upcoming invoice in parallel
    const [invoices, upcomingInvoice] = await Promise.all([
      getInvoices(companyData.stripe_customer_id, 12),
      getUpcomingInvoice(companyData.stripe_customer_id),
    ])

    // Format invoices for the frontend
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
      created: invoice.created,
      due_date: invoice.due_date,
      paid_at: invoice.status_transitions?.paid_at,
      hosted_invoice_url: invoice.hosted_invoice_url,
      invoice_pdf: invoice.invoice_pdf,
      lines: invoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    }))

    // Format upcoming invoice
    const formattedUpcoming = upcomingInvoice ? {
      amount_due: upcomingInvoice.amount_due,
      amount_remaining: upcomingInvoice.amount_remaining,
      currency: upcomingInvoice.currency,
      next_payment_attempt: upcomingInvoice.next_payment_attempt,
      period_start: upcomingInvoice.period_start,
      period_end: upcomingInvoice.period_end,
      subtotal: upcomingInvoice.subtotal,
      tax: upcomingInvoice.tax,
      total: upcomingInvoice.total,
      lines: upcomingInvoice.lines.data.map(line => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
    } : null

    return NextResponse.json({
      invoices: formattedInvoices,
      upcomingInvoice: formattedUpcoming,
    })
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
