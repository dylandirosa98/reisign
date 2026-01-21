'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, formatPrice, getUsageSummary, type PlanTier } from '@/lib/plans'
import {
  CreditCard,
  Check,
  AlertCircle,
  FileText,
  Users,
  Zap,
  Crown,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

interface CompanyBilling {
  id: string
  name: string
  billing_plan: PlanTier
  actual_plan: PlanTier
  contracts_used_this_period: number
  billing_period_start: string | null
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
}

export default function BillingPage() {
  const [company, setCompany] = useState<CompanyBilling | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchBillingInfo()
  }, [])

  async function fetchBillingInfo() {
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get user's company
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) throw new Error('No company found')

      // Get company billing info
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          billing_plan,
          actual_plan,
          contracts_used_this_period,
          billing_period_start,
          subscription_status,
          stripe_customer_id,
          stripe_subscription_id,
          trial_ends_at
        `)
        .eq('id', userData.company_id)
        .single()

      if (companyError) throw companyError

      // Get user count
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userData.company_id)

      setCompany({
        ...companyData,
        billing_plan: companyData.billing_plan || 'free',
        actual_plan: companyData.actual_plan || 'free',
        contracts_used_this_period: companyData.contracts_used_this_period || 0,
        subscription_status: companyData.subscription_status || 'active',
      })
      setUserCount(count || 1)
    } catch (err) {
      console.error('Error fetching billing info:', err)
      setError('Failed to load billing information')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpgrade(planId: PlanTier) {
    // This will redirect to Stripe checkout when configured
    if (!company?.stripe_customer_id) {
      // No Stripe customer - create checkout session
      try {
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        })
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          alert('Stripe is not configured yet. Please contact support to upgrade.')
        }
      } catch {
        alert('Stripe is not configured yet. Please contact support to upgrade.')
      }
    } else {
      // Has Stripe customer - redirect to customer portal
      try {
        const response = await fetch('/api/stripe/portal', {
          method: 'POST',
        })
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          alert('Stripe is not configured yet. Please contact support to upgrade.')
        }
      } catch {
        alert('Stripe is not configured yet. Please contact support to upgrade.')
      }
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error || 'Failed to load billing information'}
        </div>
      </div>
    )
  }

  const usage = getUsageSummary(
    company.billing_plan,
    company.actual_plan,
    company.contracts_used_this_period,
    userCount
  )

  const currentPlan = PLANS[company.actual_plan]
  const billingPlan = PLANS[company.billing_plan]
  const isOverridden = company.actual_plan !== company.billing_plan

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
        <p className="text-gray-600 mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Crown className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentPlan.name} Plan
                  {isOverridden && (
                    <span className="ml-2 text-sm font-normal text-green-600">
                      (Courtesy Access)
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500">{currentPlan.description}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(billingPlan.monthlyPrice)}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </div>
            {isOverridden && (
              <p className="text-sm text-green-600">
                Billed as {billingPlan.name}
              </p>
            )}
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contracts Usage */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Contracts This Period
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {usage.contracts.used}
              </span>
              <span className="text-gray-500 mb-0.5">
                / {usage.contracts.limit !== null ? usage.contracts.limit : '∞'}
              </span>
            </div>
            {usage.contracts.limit !== null && (
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      usage.contracts.used >= usage.contracts.limit
                        ? 'bg-red-500'
                        : usage.contracts.used >= usage.contracts.limit * 0.8
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (usage.contracts.used / usage.contracts.limit) * 100
                      )}%`,
                    }}
                  />
                </div>
                {usage.contracts.extra > 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    {usage.contracts.extra} extra contract{usage.contracts.extra !== 1 ? 's' : ''} •{' '}
                    {formatPrice(usage.contracts.extraCost)} overage
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Team Usage */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Team Members
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {usage.users.current}
              </span>
              <span className="text-gray-500 mb-0.5">
                / {usage.users.limit}
              </span>
            </div>
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    usage.users.current >= usage.users.limit
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (usage.users.current / usage.users.limit) * 100
                    )}%`,
                  }}
                />
              </div>
              {usage.users.extra > 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  {usage.users.extra} extra seat{usage.users.extra !== 1 ? 's' : ''} •{' '}
                  {formatPrice(usage.users.extraCost)}/mo
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                company.subscription_status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : company.subscription_status === 'trialing'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {company.subscription_status}
            </span>
            {company.billing_period_start && (
              <span className="text-sm text-gray-500">
                Period started{' '}
                {new Date(company.billing_period_start).toLocaleDateString()}
              </span>
            )}
          </div>
          {company.stripe_customer_id && (
            <button
              onClick={() => handleUpgrade(company.billing_plan)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Manage Subscription
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PLANS).map((plan) => {
            const isCurrent = company.billing_plan === plan.id
            const isUpgrade = Object.keys(PLANS).indexOf(plan.id) > Object.keys(PLANS).indexOf(company.billing_plan)

            return (
              <div
                key={plan.id}
                className={`p-5 rounded-xl border ${
                  isCurrent
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(plan.monthlyPrice)}
                  </span>
                  <span className="text-gray-500">/mo</span>
                </div>
                <ul className="space-y-2 mb-4 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.limits.contractsPerMonth !== null
                      ? `${plan.limits.contractsPerMonth} contracts/mo`
                      : 'Unlimited contracts'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {plan.limits.maxUsers} user{plan.limits.maxUsers !== 1 ? 's' : ''}
                  </li>
                  {plan.limits.features.aiTemplateGeneration && (
                    <li className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      AI templates
                    </li>
                  )}
                </ul>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-blue-100 text-blue-700 rounded-lg font-medium"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
                      isUpgrade
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isUpgrade ? 'Upgrade' : 'Switch'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <CreditCard className="w-5 h-5 text-gray-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
        </div>
        {company.stripe_customer_id ? (
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Manage your payment method through the Stripe customer portal.
            </p>
            <button
              onClick={() => handleUpgrade(company.billing_plan)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Manage Payment
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800">
              No payment method on file. Add a payment method to upgrade your plan.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
