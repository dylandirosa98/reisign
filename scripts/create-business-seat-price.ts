/**
 * Script to create Business tier extra seat price
 * Run with: npx tsx scripts/create-business-seat-price.ts
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
  console.log('Creating Business tier extra seat price...\n')

  // Find the existing Extra Team Seat product
  const products = await stripe.products.list({ active: true })
  const seatProduct = products.data.find(p => p.name === 'Extra Team Seat')

  if (!seatProduct) {
    console.error('Extra Team Seat product not found!')
    return
  }

  console.log(`Found product: ${seatProduct.id}`)

  // Create Business tier price ($15/month)
  const businessSeatPrice = await stripe.prices.create({
    product: seatProduct.id,
    unit_amount: 1500, // $15.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    nickname: 'Extra Seat - Business Tier',
    metadata: {
      type: 'overage',
      category: 'seat',
      tier: 'business',
    },
  })

  console.log(`Business Seat Price ID: ${businessSeatPrice.id} ($15/month)\n`)

  console.log('='.repeat(60))
  console.log('\nUpdate your .env.local:\n')
  console.log(`STRIPE_PRICE_EXTRA_SEAT_TEAM=price_1SsbfoFjGMfGce1ITAATHCw1`)
  console.log(`STRIPE_PRICE_EXTRA_SEAT_BUSINESS=${businessSeatPrice.id}`)
  console.log('')
}

main().catch(console.error)
