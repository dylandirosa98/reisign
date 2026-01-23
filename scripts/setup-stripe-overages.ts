/**
 * Script to create Stripe products and prices for overage billing
 * Run with: npx tsx scripts/setup-stripe-overages.ts
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is required')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
})

async function main() {
  console.log('Creating Stripe products for overage billing...\n')

  // Create Extra Contract product
  console.log('Creating Extra Contract product...')
  const extraContractProduct = await stripe.products.create({
    name: 'Extra Contract',
    description: 'Additional contract beyond your plan limit',
    metadata: {
      type: 'overage',
      category: 'contract',
    },
  })
  console.log(`  Product ID: ${extraContractProduct.id}`)

  // Create price for extra contract ($2.50 per contract - using middle tier pricing)
  const extraContractPrice = await stripe.prices.create({
    product: extraContractProduct.id,
    unit_amount: 250, // $2.50 in cents
    currency: 'usd',
    nickname: 'Extra Contract - Per Unit',
    metadata: {
      type: 'overage',
      category: 'contract',
    },
  })
  console.log(`  Price ID: ${extraContractPrice.id} ($2.50/contract)\n`)

  // Create Extra Seat product
  console.log('Creating Extra Seat product...')
  const extraSeatProduct = await stripe.products.create({
    name: 'Extra Team Seat',
    description: 'Additional team member beyond your plan limit',
    metadata: {
      type: 'overage',
      category: 'seat',
    },
  })
  console.log(`  Product ID: ${extraSeatProduct.id}`)

  // Create price for extra seat ($20/month per seat - using middle tier pricing)
  const extraSeatPrice = await stripe.prices.create({
    product: extraSeatProduct.id,
    unit_amount: 2000, // $20.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    nickname: 'Extra Seat - Monthly',
    metadata: {
      type: 'overage',
      category: 'seat',
    },
  })
  console.log(`  Price ID: ${extraSeatPrice.id} ($20/seat/month)\n`)

  console.log('='.repeat(60))
  console.log('\nAdd these to your .env.local:\n')
  console.log(`STRIPE_PRICE_EXTRA_CONTRACT=${extraContractPrice.id}`)
  console.log(`STRIPE_PRICE_EXTRA_SEAT=${extraSeatPrice.id}`)
  console.log('')
}

main().catch(console.error)
