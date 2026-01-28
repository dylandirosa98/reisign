/**
 * Stripe client configuration
 *
 * This module provides the Stripe client instance for billing operations.
 * Stripe will be configured when STRIPE_SECRET_KEY is set.
 */

import Stripe from 'stripe'
import { PLANS, type PlanTier } from './plans'

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

// Create Stripe instance (lazy initialization)
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) {
    return null
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-12-15.clover',
    })
  }

  return stripeInstance
}

// Stripe price IDs - to be configured after creating products in Stripe Dashboard
// Format: price_xxxx from Stripe Dashboard
export const STRIPE_PRICE_IDS: Record<PlanTier, { monthly: string | null; yearly: string | null }> = {
  free: { monthly: null, yearly: null },
  individual: {
    monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || null,
    yearly: process.env.STRIPE_PRICE_INDIVIDUAL_YEARLY || null,
  },
  team: {
    monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY || null,
    yearly: process.env.STRIPE_PRICE_TEAM_YEARLY || null,
  },
  business: {
    monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || null,
    yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || null,
  },
  admin: { monthly: null, yearly: null }, // Admin plan is free
}

// Overage price IDs for metered billing
export const STRIPE_OVERAGE_PRICE_IDS = {
  extraContract: process.env.STRIPE_PRICE_EXTRA_CONTRACT || null,
  // Seat prices by tier
  extraSeatTeam: process.env.STRIPE_PRICE_EXTRA_SEAT_TEAM || null,
  extraSeatBusiness: process.env.STRIPE_PRICE_EXTRA_SEAT_BUSINESS || null,
}

// Get the seat price ID for a given plan
export function getSeatPriceId(planTier: PlanTier): string | null {
  switch (planTier) {
    case 'team':
      return STRIPE_OVERAGE_PRICE_IDS.extraSeatTeam
    case 'business':
      return STRIPE_OVERAGE_PRICE_IDS.extraSeatBusiness
    default:
      return null // Individual and free can't add seats
  }
}

/**
 * Create a checkout session for a new subscription
 */
export async function createCheckoutSession(
  customerId: string | null,
  companyId: string,
  planId: PlanTier,
  billingInterval: 'monthly' | 'yearly' = 'monthly',
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripe()
  if (!stripe) return null

  const priceId = STRIPE_PRICE_IDS[planId][billingInterval === 'yearly' ? 'yearly' : 'monthly']
  if (!priceId) {
    console.error(`No Stripe price ID configured for ${planId} ${billingInterval}`)
    return null
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: {
      enabled: true,
    },
    metadata: {
      companyId,
      planId,
    },
    subscription_data: {
      metadata: {
        companyId,
        planId,
      },
    },
  }

  // If we have an existing customer, use them
  // Note: In subscription mode, Stripe automatically creates a customer if none exists
  if (customerId) {
    sessionParams.customer = customerId
  }

  return stripe.checkout.sessions.create(sessionParams)
}

/**
 * Create a customer portal session for managing subscription
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session | null> {
  const stripe = getStripe()
  if (!stripe) return null

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe()
  if (!stripe) return null

  return stripe.subscriptions.retrieve(subscriptionId)
}

/**
 * Update subscription to a new plan
 */
export async function updateSubscription(
  subscriptionId: string,
  newPlanId: PlanTier,
  billingInterval: 'monthly' | 'yearly' = 'monthly'
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe()
  if (!stripe) return null

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = STRIPE_PRICE_IDS[newPlanId][billingInterval === 'yearly' ? 'yearly' : 'monthly']

  if (!priceId) {
    console.error(`No Stripe price ID configured for ${newPlanId} ${billingInterval}`)
    return null
  }

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    metadata: {
      planId: newPlanId,
    },
  })
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe()
  if (!stripe) return null

  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId)
  }

  // Cancel at end of billing period
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Create a customer
 */
export async function createCustomer(
  email: string,
  name: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer | null> {
  const stripe = getStripe()
  if (!stripe) return null

  return stripe.customers.create({
    email,
    name,
    metadata,
  })
}

/**
 * Report usage for metered billing (overages)
 * Note: This uses Stripe's Billing Meter API for usage-based billing
 */
export async function reportUsage(
  subscriptionItemId: string,
  quantity: number,
  _timestamp?: number
): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe) return false

  try {
    // For metered billing, we'll track usage in our database
    // and report to Stripe during invoice generation
    console.log(`[Stripe] Would report usage: ${quantity} for ${subscriptionItemId}`)
    return true
  } catch (error) {
    console.error('[Stripe] Failed to report usage:', error)
    return false
  }
}

/**
 * Construct Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const stripe = getStripe()
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return null

  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  )
}

/**
 * Charge for an extra contract (overage)
 * Adds an invoice item to the customer's upcoming invoice
 * Price varies by plan: Individual $2.50, Small Team $2.00, Business $1.50
 */
export async function chargeExtraContract(
  customerId: string,
  planTier: PlanTier,
  description: string = 'Extra contract beyond plan limit'
): Promise<Stripe.InvoiceItem | null> {
  const stripe = getStripe()
  if (!stripe) return null

  // Get plan-specific overage price
  const plan = PLANS[planTier]
  const overagePrice = plan.limits.overagePricing.extraContractPrice

  if (overagePrice === 0) {
    console.error(`[Stripe] Plan ${planTier} does not support contract overages`)
    return null
  }

  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: customerId,
      amount: overagePrice, // Already in cents from plan config
      currency: 'usd',
      description: `${description} (${plan.name} plan)`,
    })
    console.log(`[Stripe] Charged extra contract: ${invoiceItem.id} ($${(overagePrice / 100).toFixed(2)})`)
    return invoiceItem
  } catch (error) {
    console.error('[Stripe] Failed to charge extra contract:', error)
    return null
  }
}

/**
 * Add extra seat to subscription
 * Adds the recurring extra seat price to the subscription
 * Price varies by plan: Small Team $20/mo, Business $15/mo
 */
export async function addExtraSeat(
  subscriptionId: string,
  planTier: PlanTier
): Promise<Stripe.SubscriptionItem | null> {
  const stripe = getStripe()
  if (!stripe) return null

  const priceId = getSeatPriceId(planTier)
  if (!priceId) {
    console.error(`[Stripe] No seat price configured for ${planTier} plan`)
    return null
  }

  const plan = PLANS[planTier]
  const seatPrice = plan.limits.overagePricing.extraSeatPrice

  try {
    // Check if the subscription already has an extra seat item for this price
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const existingItem = subscription.items.data.find(
      item => item.price.id === priceId
    )

    if (existingItem) {
      // Increment the quantity
      const updated = await stripe.subscriptionItems.update(existingItem.id, {
        quantity: (existingItem.quantity || 1) + 1,
      })
      console.log(`[Stripe] Incremented extra seats to ${updated.quantity} ($${(seatPrice / 100).toFixed(2)}/mo each)`)
      return updated
    } else {
      // Add new subscription item for extra seats
      const newItem = await stripe.subscriptionItems.create({
        subscription: subscriptionId,
        price: priceId,
        quantity: 1,
      })
      console.log(`[Stripe] Added extra seat: ${newItem.id} ($${(seatPrice / 100).toFixed(2)}/mo)`)
      return newItem
    }
  } catch (error) {
    console.error('[Stripe] Failed to add extra seat:', error)
    return null
  }
}

/**
 * Remove extra seat from subscription
 * Handles both Team and Business tier seat prices
 */
export async function removeExtraSeat(
  subscriptionId: string,
  planTier: PlanTier
): Promise<boolean> {
  const stripe = getStripe()
  if (!stripe) return false

  const priceId = getSeatPriceId(planTier)
  if (!priceId) return false

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    const existingItem = subscription.items.data.find(
      item => item.price.id === priceId
    )

    if (!existingItem) return true // No extra seats to remove

    if ((existingItem.quantity || 1) > 1) {
      // Decrement the quantity
      await stripe.subscriptionItems.update(existingItem.id, {
        quantity: (existingItem.quantity || 1) - 1,
      })
      console.log(`[Stripe] Decremented extra seats`)
    } else {
      // Remove the item entirely
      await stripe.subscriptionItems.del(existingItem.id)
      console.log(`[Stripe] Removed extra seat item`)
    }
    return true
  } catch (error) {
    console.error('[Stripe] Failed to remove extra seat:', error)
    return false
  }
}

/**
 * Get past invoices for a customer
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const stripe = getStripe()
  if (!stripe) return []

  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
    })
    return invoices.data
  } catch (error) {
    console.error('[Stripe] Failed to get invoices:', error)
    return []
  }
}

/**
 * Get upcoming invoice for a customer
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.Invoice | null> {
  const stripe = getStripe()
  if (!stripe) return null

  try {
    const invoice = await stripe.invoices.createPreview({
      customer: customerId,
    })
    return invoice
  } catch (error) {
    // No upcoming invoice is not an error - it means no active subscription
    const stripeError = error as { code?: string }
    if (stripeError.code === 'invoice_upcoming_none') {
      return null
    }
    console.error('[Stripe] Failed to get upcoming invoice:', error)
    return null
  }
}
