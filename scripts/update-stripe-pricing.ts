/**
 * Script to update Stripe products and prices for the new pricing structure
 *
 * New pricing:
 * - Standard (was Individual): $39/mo, 5 contracts, $1.50/extra contract
 * - Teams (was Small Team): $59/mo, 10 contracts, $1.25/extra contract, $20/extra seat
 * - Enterprise (was Business): $129/mo, 40 contracts, $1.00/extra contract, $15/extra seat
 *
 * Run with: npx tsx scripts/update-stripe-pricing.ts
 */

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('STRIPE_SECRET_KEY environment variable is required')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover' as Stripe.LatestApiVersion,
})

// New pricing configuration
const NEW_PRICING = {
  standard: {
    name: 'Standard Plan',
    description: 'For solo wholesalers - 5 contracts/month',
    monthlyPrice: 3900, // $39
    yearlyPrice: 39000, // $390
  },
  teams: {
    name: 'Teams Plan',
    description: 'For growing businesses - 10 contracts/month, 3 users',
    monthlyPrice: 5900, // $59
    yearlyPrice: 59000, // $590
  },
  enterprise: {
    name: 'Enterprise Plan',
    description: 'For teams & brokerages - 40 contracts/month, 5 users',
    monthlyPrice: 12900, // $129
    yearlyPrice: 129000, // $1290
  },
}

async function main() {
  console.log('Updating Stripe pricing structure...\n')
  console.log('='.repeat(60))

  // Get existing products
  console.log('\nFetching existing products...')
  const products = await stripe.products.list({ limit: 100, active: true })

  // Find or create products for each plan
  const results: Record<string, { productId: string; monthlyPriceId: string; yearlyPriceId: string }> = {}

  // Standard Plan (was Individual)
  console.log('\n--- STANDARD PLAN (was Individual) ---')
  let standardProduct = products.data.find(p =>
    p.name.toLowerCase().includes('individual') ||
    p.name.toLowerCase().includes('standard') ||
    p.metadata?.planId === 'individual'
  )

  if (!standardProduct) {
    console.log('Creating new Standard product...')
    standardProduct = await stripe.products.create({
      name: NEW_PRICING.standard.name,
      description: NEW_PRICING.standard.description,
      metadata: { planId: 'individual' },
    })
  } else {
    console.log(`Found existing product: ${standardProduct.id}`)
    // Update the name
    await stripe.products.update(standardProduct.id, {
      name: NEW_PRICING.standard.name,
      description: NEW_PRICING.standard.description,
    })
    console.log('Updated product name to "Standard Plan"')
  }

  // Create new prices for Standard (price stays at $39)
  console.log('Creating new prices...')
  const standardMonthly = await stripe.prices.create({
    product: standardProduct.id,
    unit_amount: NEW_PRICING.standard.monthlyPrice,
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: 'Standard Monthly',
    metadata: { planId: 'individual' },
  })
  const standardYearly = await stripe.prices.create({
    product: standardProduct.id,
    unit_amount: NEW_PRICING.standard.yearlyPrice,
    currency: 'usd',
    recurring: { interval: 'year' },
    nickname: 'Standard Yearly',
    metadata: { planId: 'individual' },
  })
  results.standard = {
    productId: standardProduct.id,
    monthlyPriceId: standardMonthly.id,
    yearlyPriceId: standardYearly.id,
  }
  console.log(`  Monthly: ${standardMonthly.id} ($${NEW_PRICING.standard.monthlyPrice / 100})`)
  console.log(`  Yearly: ${standardYearly.id} ($${NEW_PRICING.standard.yearlyPrice / 100})`)

  // Teams Plan (was Small Team)
  console.log('\n--- TEAMS PLAN (was Small Team) ---')
  let teamsProduct = products.data.find(p =>
    p.name.toLowerCase().includes('team') ||
    p.metadata?.planId === 'team'
  )

  if (!teamsProduct) {
    console.log('Creating new Teams product...')
    teamsProduct = await stripe.products.create({
      name: NEW_PRICING.teams.name,
      description: NEW_PRICING.teams.description,
      metadata: { planId: 'team' },
    })
  } else {
    console.log(`Found existing product: ${teamsProduct.id}`)
    await stripe.products.update(teamsProduct.id, {
      name: NEW_PRICING.teams.name,
      description: NEW_PRICING.teams.description,
    })
    console.log('Updated product name to "Teams Plan"')
  }

  // Create new prices for Teams ($79 -> $59)
  console.log('Creating new prices...')
  const teamsMonthly = await stripe.prices.create({
    product: teamsProduct.id,
    unit_amount: NEW_PRICING.teams.monthlyPrice,
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: 'Teams Monthly',
    metadata: { planId: 'team' },
  })
  const teamsYearly = await stripe.prices.create({
    product: teamsProduct.id,
    unit_amount: NEW_PRICING.teams.yearlyPrice,
    currency: 'usd',
    recurring: { interval: 'year' },
    nickname: 'Teams Yearly',
    metadata: { planId: 'team' },
  })
  results.teams = {
    productId: teamsProduct.id,
    monthlyPriceId: teamsMonthly.id,
    yearlyPriceId: teamsYearly.id,
  }
  console.log(`  Monthly: ${teamsMonthly.id} ($${NEW_PRICING.teams.monthlyPrice / 100})`)
  console.log(`  Yearly: ${teamsYearly.id} ($${NEW_PRICING.teams.yearlyPrice / 100})`)

  // Enterprise Plan (was Business)
  console.log('\n--- ENTERPRISE PLAN (was Business) ---')
  let enterpriseProduct = products.data.find(p =>
    p.name.toLowerCase().includes('business') ||
    p.name.toLowerCase().includes('enterprise') ||
    p.metadata?.planId === 'business'
  )

  if (!enterpriseProduct) {
    console.log('Creating new Enterprise product...')
    enterpriseProduct = await stripe.products.create({
      name: NEW_PRICING.enterprise.name,
      description: NEW_PRICING.enterprise.description,
      metadata: { planId: 'business' },
    })
  } else {
    console.log(`Found existing product: ${enterpriseProduct.id}`)
    await stripe.products.update(enterpriseProduct.id, {
      name: NEW_PRICING.enterprise.name,
      description: NEW_PRICING.enterprise.description,
    })
    console.log('Updated product name to "Enterprise Plan"')
  }

  // Create new prices for Enterprise ($199 -> $129)
  console.log('Creating new prices...')
  const enterpriseMonthly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: NEW_PRICING.enterprise.monthlyPrice,
    currency: 'usd',
    recurring: { interval: 'month' },
    nickname: 'Enterprise Monthly',
    metadata: { planId: 'business' },
  })
  const enterpriseYearly = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: NEW_PRICING.enterprise.yearlyPrice,
    currency: 'usd',
    recurring: { interval: 'year' },
    nickname: 'Enterprise Yearly',
    metadata: { planId: 'business' },
  })
  results.enterprise = {
    productId: enterpriseProduct.id,
    monthlyPriceId: enterpriseMonthly.id,
    yearlyPriceId: enterpriseYearly.id,
  }
  console.log(`  Monthly: ${enterpriseMonthly.id} ($${NEW_PRICING.enterprise.monthlyPrice / 100})`)
  console.log(`  Yearly: ${enterpriseYearly.id} ($${NEW_PRICING.enterprise.yearlyPrice / 100})`)

  // Output environment variables
  console.log('\n' + '='.repeat(60))
  console.log('\nUpdate your .env.local with these new price IDs:\n')
  console.log('# Subscription Prices (Updated ' + new Date().toISOString().split('T')[0] + ')')
  console.log(`STRIPE_PRICE_INDIVIDUAL_MONTHLY=${results.standard.monthlyPriceId}`)
  console.log(`STRIPE_PRICE_INDIVIDUAL_YEARLY=${results.standard.yearlyPriceId}`)
  console.log(`STRIPE_PRICE_TEAM_MONTHLY=${results.teams.monthlyPriceId}`)
  console.log(`STRIPE_PRICE_TEAM_YEARLY=${results.teams.yearlyPriceId}`)
  console.log(`STRIPE_PRICE_BUSINESS_MONTHLY=${results.enterprise.monthlyPriceId}`)
  console.log(`STRIPE_PRICE_BUSINESS_YEARLY=${results.enterprise.yearlyPriceId}`)

  console.log('\n' + '='.repeat(60))
  console.log('\nPricing update complete!')
  console.log('\nNOTE: Old prices are still active for existing subscribers.')
  console.log('You can archive old prices in Stripe Dashboard if needed.')
  console.log('\nNew pricing summary:')
  console.log('  - Standard: $39/mo (5 contracts, $1.50/extra)')
  console.log('  - Teams: $59/mo (10 contracts, 3 users, $1.25/extra, $20/seat)')
  console.log('  - Enterprise: $129/mo (40 contracts, 5 users, $1.00/extra, $15/seat)')
}

main().catch(console.error)
