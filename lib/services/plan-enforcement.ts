/**
 * Plan Enforcement Service
 *
 * Provides utilities for checking and enforcing plan limits
 * before allowing actions like creating contracts or inviting users.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  type PlanTier,
  canCreateContract,
  canAddTeamMember,
  hasFeature,
  PLANS,
  type PlanLimits,
} from '@/lib/plans'

export interface EnforcementResult {
  allowed: boolean
  reason?: string
  overagePrice?: number // in cents
  upgradeRequired?: boolean
  suggestedPlan?: PlanTier
}

/**
 * Check if a company can create a new contract
 */
export async function checkContractCreation(
  companyId: string
): Promise<EnforcementResult> {
  const adminSupabase = createAdminClient()

  const { data: company, error } = await adminSupabase
    .from('companies')
    .select('actual_plan, billing_plan, contracts_used_this_period')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return {
      allowed: false,
      reason: 'Company not found',
    }
  }

  const actualPlan = (company.actual_plan || 'free') as PlanTier
  const contractsUsed = company.contracts_used_this_period || 0

  const result = canCreateContract(actualPlan, contractsUsed)

  if (!result.allowed) {
    return {
      allowed: false,
      reason: result.reason,
      upgradeRequired: true,
      suggestedPlan: getSuggestedUpgrade(actualPlan),
    }
  }

  return {
    allowed: true,
    reason: result.reason,
    overagePrice: result.overagePrice,
  }
}

/**
 * Check if a company can add a new team member
 */
export async function checkTeamInvite(
  companyId: string
): Promise<EnforcementResult> {
  const adminSupabase = createAdminClient()

  // Get company plan
  const { data: company, error: companyError } = await adminSupabase
    .from('companies')
    .select('actual_plan')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    return {
      allowed: false,
      reason: 'Company not found',
    }
  }

  // Count current users
  const { count, error: countError } = await adminSupabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (countError) {
    return {
      allowed: false,
      reason: 'Failed to check user count',
    }
  }

  const actualPlan = (company.actual_plan || 'free') as PlanTier
  const currentUserCount = count || 0

  const result = canAddTeamMember(actualPlan, currentUserCount)

  if (!result.allowed) {
    return {
      allowed: false,
      reason: result.reason,
      upgradeRequired: true,
      suggestedPlan: getSuggestedUpgrade(actualPlan),
    }
  }

  return {
    allowed: true,
    reason: result.reason,
    overagePrice: result.overagePrice,
  }
}

/**
 * Check if a company has access to a specific feature
 */
export async function checkFeatureAccess(
  companyId: string,
  feature: keyof PlanLimits['features']
): Promise<EnforcementResult> {
  const adminSupabase = createAdminClient()

  const { data: company, error } = await adminSupabase
    .from('companies')
    .select('actual_plan')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return {
      allowed: false,
      reason: 'Company not found',
    }
  }

  const actualPlan = (company.actual_plan || 'free') as PlanTier
  const allowed = hasFeature(actualPlan, feature)

  if (!allowed) {
    // Find the minimum plan that has this feature
    const requiredPlan = getMinimumPlanForFeature(feature)

    return {
      allowed: false,
      reason: `This feature requires the ${PLANS[requiredPlan].name} plan or higher.`,
      upgradeRequired: true,
      suggestedPlan: requiredPlan,
    }
  }

  return { allowed: true }
}

/**
 * Increment contract count after creating a contract
 */
export async function incrementContractCount(
  companyId: string
): Promise<number> {
  const adminSupabase = createAdminClient()

  // Use RPC function for atomic increment
  const { data, error } = await (adminSupabase.rpc as any)('increment_contract_count', {
    p_company_id: companyId,
  })

  if (error) {
    console.error('Failed to increment contract count:', error)
    // Fallback to direct update
    const { data: company } = await adminSupabase
      .from('companies')
      .select('contracts_used_this_period')
      .eq('id', companyId)
      .single()

    const newCount = (company?.contracts_used_this_period || 0) + 1

    await adminSupabase
      .from('companies')
      .update({ contracts_used_this_period: newCount })
      .eq('id', companyId)

    return newCount
  }

  return data as number
}

/**
 * Log usage for analytics
 */
export async function logUsage(
  companyId: string,
  userId: string | null,
  actionType: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const adminSupabase = createAdminClient()

  // Cast to any since usage_logs is a new table not in types yet
  await (adminSupabase.from as any)('usage_logs').insert({
    company_id: companyId,
    user_id: userId,
    action_type: actionType,
    metadata,
  })
}

/**
 * Get suggested upgrade plan based on current plan
 */
function getSuggestedUpgrade(currentPlan: PlanTier): PlanTier {
  const upgradePath: Record<PlanTier, PlanTier> = {
    free: 'individual',
    individual: 'team',
    team: 'business',
    business: 'business', // Can't upgrade further
    admin: 'admin', // Admin plan doesn't need upgrades
  }

  return upgradePath[currentPlan]
}

/**
 * Get the minimum plan that has a specific feature
 */
function getMinimumPlanForFeature(feature: keyof PlanLimits['features']): PlanTier {
  const planOrder: PlanTier[] = ['free', 'individual', 'team', 'business']

  for (const plan of planOrder) {
    if (PLANS[plan].limits.features[feature]) {
      return plan
    }
  }

  return 'business' // Fallback to highest plan
}

/**
 * Get company's current usage and limits
 */
export async function getCompanyUsage(companyId: string) {
  const adminSupabase = createAdminClient()

  const { data: company, error } = await adminSupabase
    .from('companies')
    .select(`
      billing_plan,
      actual_plan,
      contracts_used_this_period,
      billing_period_start,
      subscription_status
    `)
    .eq('id', companyId)
    .single()

  if (error || !company) {
    return null
  }

  const { count: userCount } = await adminSupabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const billingPlan = (company.billing_plan || 'free') as PlanTier
  const actualPlan = (company.actual_plan || 'free') as PlanTier
  const plan = PLANS[actualPlan]

  return {
    billingPlan,
    actualPlan,
    planDetails: plan,
    contracts: {
      used: company.contracts_used_this_period || 0,
      limit: plan.limits.contractsPerMonth,
      remaining: plan.limits.contractsPerMonth !== null
        ? Math.max(0, plan.limits.contractsPerMonth - (company.contracts_used_this_period || 0))
        : null,
    },
    users: {
      current: userCount || 0,
      limit: plan.limits.maxUsers,
    },
    billingPeriodStart: company.billing_period_start,
    subscriptionStatus: company.subscription_status,
  }
}
