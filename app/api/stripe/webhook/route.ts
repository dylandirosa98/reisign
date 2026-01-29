import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { constructWebhookEvent, isStripeConfigured, getSubscription } from '@/lib/stripe'
import { PLANS, type PlanTier } from '@/lib/plans'
import { sendAdminNotification } from '@/lib/services/email'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    )
  }

  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event | null
  try {
    event = constructWebhookEvent(payload, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  if (!event) {
    return NextResponse.json(
      { error: 'Failed to construct event' },
      { status: 400 }
    )
  }

  const adminSupabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const companyId = session.metadata?.companyId
          const planId = session.metadata?.planId as PlanTier

          if (companyId && planId) {
            // Get the subscription to get customer ID
            const subscription = await getSubscription(session.subscription as string)

            // Update company with Stripe info
            await adminSupabase
              .from('companies')
              .update({
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                billing_plan: planId,
                actual_plan: planId,
                subscription_status: subscription?.status || 'active',
              })
              .eq('id', companyId)

            // Log the subscription change
            await (adminSupabase.from as any)('subscription_history')
              .insert({
                company_id: companyId,
                new_billing_plan: planId,
                new_actual_plan: planId,
                reason: 'checkout_completed',
                stripe_event_id: event.id,
              })

            // Notify admin of new subscription
            const planName = PLANS[planId]?.name || planId
            const { data: companyInfo } = await adminSupabase
              .from('companies')
              .select('name')
              .eq('id', companyId)
              .single()

            sendAdminNotification({
              subject: `New Subscription: ${planName}`,
              event: 'New Subscription Activated',
              details: {
                'Company': companyInfo?.name || companyId,
                'Plan': planName,
                'Customer Email': (session.customer_details as any)?.email || 'Unknown',
                'Date': new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
              },
            }).catch(() => {}) // Fire and forget
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const companyId = subscription.metadata?.companyId
        const planId = subscription.metadata?.planId as PlanTier

        if (companyId) {
          const updates: Record<string, unknown> = {
            subscription_status: subscription.status,
          }

          // Only update plan if it's in the metadata
          if (planId) {
            updates.billing_plan = planId
            updates.actual_plan = planId
          }

          await adminSupabase
            .from('companies')
            .update(updates)
            .eq('id', companyId)
        } else {
          // Try to find company by customer ID
          const { data: company } = await adminSupabase
            .from('companies')
            .select('id')
            .eq('stripe_customer_id', subscription.customer as string)
            .single()

          if (company) {
            await adminSupabase
              .from('companies')
              .update({
                subscription_status: subscription.status,
              })
              .eq('id', company.id)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Find company by subscription ID
        const { data: company } = await adminSupabase
          .from('companies')
          .select('id, billing_plan, actual_plan')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        if (company) {
          // Log the cancellation
          await (adminSupabase.from as any)('subscription_history')
            .insert({
              company_id: company.id,
              previous_billing_plan: company.billing_plan,
              previous_actual_plan: company.actual_plan,
              new_billing_plan: 'free',
              new_actual_plan: 'free',
              reason: 'subscription_canceled',
              stripe_event_id: event.id,
            })

          // Downgrade to free
          await adminSupabase
            .from('companies')
            .update({
              billing_plan: 'free',
              actual_plan: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', company.id)

          // Notify admin of cancellation
          const { data: cancelledCompany } = await adminSupabase
            .from('companies')
            .select('name')
            .eq('id', company.id)
            .single()

          const previousPlan = PLANS[company.billing_plan as PlanTier]?.name || company.billing_plan

          sendAdminNotification({
            subject: `Subscription Cancelled: ${cancelledCompany?.name || 'Unknown'}`,
            event: 'Subscription Cancelled',
            details: {
              'Company': cancelledCompany?.name || company.id,
              'Previous Plan': previousPlan || 'Unknown',
              'Date': new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago' }),
            },
          }).catch(() => {}) // Fire and forget
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }

        // Reset contract count on successful payment (new billing period)
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id

        if (subscriptionId) {
          const { data: company } = await adminSupabase
            .from('companies')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (company) {
            await adminSupabase
              .from('companies')
              .update({
                contracts_used_this_period: 0,
                billing_period_start: new Date().toISOString(),
              })
              .eq('id', company.id)
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }

        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id

        if (subscriptionId) {
          const { data: company } = await adminSupabase
            .from('companies')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

          if (company) {
            await adminSupabase
              .from('companies')
              .update({
                subscription_status: 'past_due',
              })
              .eq('id', company.id)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
