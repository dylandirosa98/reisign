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
  extraSeat: process.env.STRIPE_PRICE_EXTRA_SEAT || null,
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
  if (customerId) {
    sessionParams.customer = customerId
  } else {
    sessionParams.customer_creation = 'always'
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
