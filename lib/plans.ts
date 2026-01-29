/**
 * Plan configuration and utilities for REI Sign
 *
 * billing_plan: What the customer is charged for
 * actual_plan: What features they have access to (can differ for promotions, free accounts, etc.)
 */

export type PlanTier = 'free' | 'individual' | 'team' | 'business' | 'admin'

export interface PlanLimits {
  contractsPerMonth: number | null // null = unlimited
  maxUsers: number
  features: {
    allStateTemplates: boolean
    customTemplates: boolean
    aiTemplateGeneration: boolean
    customBranding: boolean
    apiAccess: boolean
    prioritySupport: boolean
    dedicatedSupport: boolean
  }
  overagePricing: {
    extraContractPrice: number // in cents
    extraSeatPrice: number // in cents per month
  }
}

export interface PlanConfig {
  id: PlanTier
  name: string
  description: string
  monthlyPrice: number // in cents
  yearlyPrice: number // in cents (for future annual plans)
  limits: PlanLimits
  stripePriceId?: string // Will be set when Stripe is configured
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started at no cost',
    monthlyPrice: 0,
    yearlyPrice: 0, // No annual for free
    limits: {
      contractsPerMonth: 2,
      maxUsers: 1,
      features: {
        allStateTemplates: false,
        customTemplates: false,
        aiTemplateGeneration: false,
        customBranding: false,
        apiAccess: false,
        prioritySupport: false,
        dedicatedSupport: false,
      },
      overagePricing: {
        extraContractPrice: 0, // Free tier cannot have overages - must upgrade
        extraSeatPrice: 0, // N/A for free
      },
    },
  },
  individual: {
    id: 'individual',
    name: 'Standard',
    description: 'For solo wholesalers',
    monthlyPrice: 3900, // $39
    yearlyPrice: 39000, // $390 (10x monthly)
    limits: {
      contractsPerMonth: 5,
      maxUsers: 1,
      features: {
        allStateTemplates: true,
        customTemplates: true,
        aiTemplateGeneration: true,
        customBranding: false,
        apiAccess: false,
        prioritySupport: true,
        dedicatedSupport: false,
      },
      overagePricing: {
        extraContractPrice: 149, // $1.49 per extra contract
        extraSeatPrice: 0, // N/A for standard (only 1 user allowed)
      },
    },
  },
  team: {
    id: 'team',
    name: 'Teams',
    description: 'For growing businesses',
    monthlyPrice: 5900, // $59
    yearlyPrice: 59000, // $590 (10x monthly)
    limits: {
      contractsPerMonth: 10,
      maxUsers: 3,
      features: {
        allStateTemplates: true,
        customTemplates: true,
        aiTemplateGeneration: true,
        customBranding: false,
        apiAccess: false,
        prioritySupport: true,
        dedicatedSupport: false,
      },
      overagePricing: {
        extraContractPrice: 97, // $0.97 per extra contract
        extraSeatPrice: 1900, // $19 per extra seat per month
      },
    },
  },
  business: {
    id: 'business',
    name: 'Enterprise',
    description: 'For teams & brokerages',
    monthlyPrice: 12900, // $129
    yearlyPrice: 129000, // $1290 (10x monthly)
    limits: {
      contractsPerMonth: 300, // Effectively unlimited for wholesalers
      maxUsers: 4,
      features: {
        allStateTemplates: true,
        customTemplates: true,
        aiTemplateGeneration: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        dedicatedSupport: true,
      },
      overagePricing: {
        extraContractPrice: 0, // Unlimited contracts included
        extraSeatPrice: 1900, // $19 per extra seat per month
      },
    },
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    description: 'System administrator access',
    monthlyPrice: 0, // Free
    yearlyPrice: 0,
    limits: {
      contractsPerMonth: null, // Unlimited
      maxUsers: 999, // Effectively unlimited
      features: {
        allStateTemplates: true,
        customTemplates: true,
        aiTemplateGeneration: true,
        customBranding: true,
        apiAccess: true,
        prioritySupport: true,
        dedicatedSupport: true,
      },
      overagePricing: {
        extraContractPrice: 0, // N/A - unlimited
        extraSeatPrice: 0, // N/A - unlimited
      },
    },
  },
}

/**
 * Get the plan configuration for a given tier
 */
export function getPlan(tier: PlanTier): PlanConfig {
  return PLANS[tier]
}

/**
 * Check if a company can create more contracts this period
 */
export function canCreateContract(
  actualPlan: PlanTier,
  contractsUsedThisPeriod: number
): { allowed: boolean; reason?: string; overagePrice?: number; isOverage?: boolean } {
  const plan = PLANS[actualPlan]
  const limit = plan.limits.contractsPerMonth

  // Unlimited contracts
  if (limit === null) {
    return { allowed: true }
  }

  // Within limits
  if (contractsUsedThisPeriod < limit) {
    return { allowed: true }
  }

  // Free tier cannot have overages - must upgrade
  if (actualPlan === 'free') {
    return {
      allowed: false,
      reason: `You've reached your free plan limit of ${limit} contracts this month. Please upgrade to a paid plan to create more contracts.`,
    }
  }

  // Paid plans allow overages
  return {
    allowed: true,
    isOverage: true,
    reason: `Contract limit reached (${contractsUsedThisPeriod}/${limit}). This contract will be charged at $${(plan.limits.overagePricing.extraContractPrice / 100).toFixed(2)} on your next bill.`,
    overagePrice: plan.limits.overagePricing.extraContractPrice,
  }
}

/**
 * Check if a company can add more team members
 */
export function canAddTeamMember(
  actualPlan: PlanTier,
  currentUserCount: number
): { allowed: boolean; reason?: string; overagePrice?: number } {
  const plan = PLANS[actualPlan]
  const maxUsers = plan.limits.maxUsers

  // Within limits
  if (currentUserCount < maxUsers) {
    return { allowed: true }
  }

  // Check if plan supports additional seats
  if (plan.limits.overagePricing.extraSeatPrice === 0) {
    return {
      allowed: false,
      reason: `Your ${plan.name} plan only supports ${maxUsers} user${maxUsers === 1 ? '' : 's'}. Please upgrade to add more team members.`,
    }
  }

  // Over limit but can add more with extra charge
  return {
    allowed: true,
    reason: `Adding more team members will incur an additional charge of $${(plan.limits.overagePricing.extraSeatPrice / 100).toFixed(2)}/month per extra seat.`,
    overagePrice: plan.limits.overagePricing.extraSeatPrice,
  }
}

/**
 * Check if a company has access to a specific feature
 */
export function hasFeature(
  actualPlan: PlanTier,
  feature: keyof PlanLimits['features']
): boolean {
  return PLANS[actualPlan].limits.features[feature]
}

/**
 * Calculate the number of extra contracts used (for billing)
 */
export function getExtraContractsUsed(
  billingPlan: PlanTier,
  contractsUsedThisPeriod: number
): number {
  const plan = PLANS[billingPlan]
  const limit = plan.limits.contractsPerMonth

  if (limit === null) return 0 // Unlimited
  if (contractsUsedThisPeriod <= limit) return 0

  return contractsUsedThisPeriod - limit
}

/**
 * Calculate the number of extra seats (for billing)
 */
export function getExtraSeats(
  billingPlan: PlanTier,
  currentUserCount: number
): number {
  const plan = PLANS[billingPlan]
  const maxUsers = plan.limits.maxUsers

  if (currentUserCount <= maxUsers) return 0

  return currentUserCount - maxUsers
}

/**
 * Format price for display
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Get usage summary for a company
 */
export interface UsageSummary {
  plan: PlanConfig
  contracts: {
    used: number
    limit: number | null
    remaining: number | null
    extra: number
    extraCost: number
  }
  users: {
    current: number
    limit: number
    extra: number
    extraCost: number
  }
  totalMonthlyCharge: number
}

export function getUsageSummary(
  billingPlan: PlanTier,
  actualPlan: PlanTier,
  contractsUsed: number,
  userCount: number
): UsageSummary {
  const plan = PLANS[actualPlan]
  const billingPlanConfig = PLANS[billingPlan]

  const contractLimit = plan.limits.contractsPerMonth
  const extraContracts = getExtraContractsUsed(billingPlan, contractsUsed)
  const extraSeats = getExtraSeats(billingPlan, userCount)

  const contractExtraCost = extraContracts * billingPlanConfig.limits.overagePricing.extraContractPrice
  const seatExtraCost = extraSeats * billingPlanConfig.limits.overagePricing.extraSeatPrice

  return {
    plan,
    contracts: {
      used: contractsUsed,
      limit: contractLimit,
      remaining: contractLimit !== null ? Math.max(0, contractLimit - contractsUsed) : null,
      extra: extraContracts,
      extraCost: contractExtraCost,
    },
    users: {
      current: userCount,
      limit: plan.limits.maxUsers,
      extra: extraSeats,
      extraCost: seatExtraCost,
    },
    totalMonthlyCharge: billingPlanConfig.monthlyPrice + contractExtraCost + seatExtraCost,
  }
}
