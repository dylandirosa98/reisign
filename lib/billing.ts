/**
 * Billing calculation utilities
 */

import { PLANS, type PlanTier } from './plans'

export interface BillingDetails {
  // Current plan info
  billingPlan: PlanTier
  actualPlan: PlanTier
  billingInterval: 'monthly' | 'yearly'

  // Usage this period
  contractsUsed: number
  contractsAllowed: number | null // null = unlimited
  extraContracts: number

  usersCount: number
  usersAllowed: number
  extraSeats: number

  // Costs
  baseSubscriptionCost: number // in cents
  extraContractsCost: number // in cents (accumulated this period)
  extraSeatsCost: number // in cents per month

  // Estimated next invoice
  estimatedNextInvoice: number // in cents

  // Billing dates
  billingPeriodStart: Date | null
  nextBillingDate: Date | null
}

/**
 * Calculate next billing date based on signup date
 * - If signup on 29, 30, 31: first charge that day, then 1st of each following month
 * - Otherwise: same day each month
 */
export function calculateNextBillingDate(
  currentBillingDate: Date,
  billingInterval: 'monthly' | 'yearly' = 'monthly'
): Date {
  const signupDay = currentBillingDate.getDate()

  if (billingInterval === 'yearly') {
    const nextDate = new Date(currentBillingDate)
    nextDate.setFullYear(nextDate.getFullYear() + 1)
    return nextDate
  }

  // Monthly billing
  if (signupDay >= 29) {
    // Move to 1st of the month after next
    const nextDate = new Date(currentBillingDate)
    nextDate.setMonth(nextDate.getMonth() + 2)
    nextDate.setDate(1)
    return nextDate
  }

  // Normal case: same day next month
  const nextDate = new Date(currentBillingDate)
  nextDate.setMonth(nextDate.getMonth() + 1)
  return nextDate
}

/**
 * Calculate billing details for a company
 */
export function calculateBillingDetails(
  billingPlan: PlanTier,
  actualPlan: PlanTier,
  billingInterval: 'monthly' | 'yearly',
  contractsUsed: number,
  usersCount: number,
  billingPeriodStart: Date | null,
  nextBillingDate: Date | null
): BillingDetails {
  const plan = PLANS[actualPlan]
  const billingPlanConfig = PLANS[billingPlan]

  // Calculate extra contracts
  const contractsAllowed = plan.limits.contractsPerMonth
  const extraContracts = contractsAllowed !== null
    ? Math.max(0, contractsUsed - contractsAllowed)
    : 0

  // Calculate extra seats
  const usersAllowed = plan.limits.maxUsers
  const extraSeats = Math.max(0, usersCount - usersAllowed)

  // Calculate costs
  const baseSubscriptionCost = billingInterval === 'yearly'
    ? billingPlanConfig.yearlyPrice
    : billingPlanConfig.monthlyPrice

  // Extra contracts cost (only for paid plans)
  const extraContractsCost = billingPlan !== 'free'
    ? extraContracts * billingPlanConfig.limits.overagePricing.extraContractPrice
    : 0

  // Extra seats cost per month
  const extraSeatsCost = extraSeats * billingPlanConfig.limits.overagePricing.extraSeatPrice

  // Estimated next invoice
  // = base subscription + accumulated contract overages + extra seats
  const estimatedNextInvoice = baseSubscriptionCost + extraContractsCost + extraSeatsCost

  return {
    billingPlan,
    actualPlan,
    billingInterval,
    contractsUsed,
    contractsAllowed,
    extraContracts,
    usersCount,
    usersAllowed,
    extraSeats,
    baseSubscriptionCost,
    extraContractsCost,
    extraSeatsCost,
    estimatedNextInvoice,
    billingPeriodStart,
    nextBillingDate,
  }
}

/**
 * Calculate prorated credit when upgrading
 */
export function calculateUpgradeCredit(
  currentPlan: PlanTier,
  billingInterval: 'monthly' | 'yearly',
  daysRemaining: number,
  totalDaysInPeriod: number
): number {
  const planConfig = PLANS[currentPlan]
  const periodCost = billingInterval === 'yearly'
    ? planConfig.yearlyPrice
    : planConfig.monthlyPrice

  // Prorated credit based on remaining days
  return Math.round((periodCost * daysRemaining) / totalDaysInPeriod)
}

/**
 * Format cents as currency string
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Get billing cycle info
 */
export interface BillingCycle {
  id: string
  cycleStart: Date
  cycleEnd: Date
  planAtCycleStart: PlanTier
  baseAmount: number
  extraSeatsCount: number
  extraSeatsAmount: number
  extraContractsCount: number
  extraContractsAmount: number
  totalAmount: number
  status: 'pending' | 'paid' | 'failed'
  paidAt: Date | null
}

/**
 * Calculate days until next billing
 */
export function daysUntilNextBilling(nextBillingDate: Date | null): number | null {
  if (!nextBillingDate) return null

  const now = new Date()
  const diffTime = nextBillingDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}
