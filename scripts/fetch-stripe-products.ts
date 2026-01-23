/**
 * Script to fetch Stripe products and prices
 * Run with: npx tsx scripts/fetch-stripe-products.ts
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
  console.log('Fetching Stripe products and prices...\n')

  // Fetch all products
  const products = await stripe.products.list({ active: true })
  console.log(`Found ${products.data.length} products:\n`)

  for (const product of products.data) {
    console.log(`Product: ${product.name}`)
    console.log(`  ID: ${product.id}`)
    console.log(`  Description: ${product.description || 'N/A'}`)

    // Fetch prices for this product
    const prices = await stripe.prices.list({ product: product.id, active: true })
    console.log(`  Prices:`)

    for (const price of prices.data) {
      const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : 'N/A'
      const interval = price.recurring?.interval || 'one-time'
      console.log(`    - ${price.id}: ${amount}/${interval}`)
    }
    console.log('')
  }

  // Generate env var suggestions
  console.log('='.repeat(60))
  console.log('\nSuggested .env.local additions:\n')

  for (const product of products.data) {
    const prices = await stripe.prices.list({ product: product.id, active: true })

    for (const price of prices.data) {
      const productName = product.name.toLowerCase().replace(/\s+/g, '_')
      const interval = price.recurring?.interval || 'one_time'
      const envName = `STRIPE_PRICE_${productName.toUpperCase()}_${interval.toUpperCase()}`
      console.log(`${envName}=${price.id}`)
    }
  }
}

main().catch(console.error)
