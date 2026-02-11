'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Receipt,
  Calendar,
  Download,
  Loader2,
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

interface InvoiceLine {
  description: string
  amount: number
  quantity: number | null
}

interface Invoice {
  id: string
  number: string | null
  status: string | null
  amount_due: number
  amount_paid: number
  currency: string
  created: number
  due_date: number | null
  paid_at: number | null
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  lines: InvoiceLine[]
}

interface UpcomingInvoice {
  amount_due: number
  amount_remaining: number
  currency: string
  next_payment_attempt: number | null
  period_start: number
  period_end: number
  subtotal: number
  tax: number | null
  total: number
  lines: InvoiceLine[]
}

export default function BillingPage() {
  const [company, setCompany] = useState<CompanyBilling | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [upcomingInvoice, setUpcomingInvoice] = useState<UpcomingInvoice | null>(null)
  const [invoicesLoading, setInvoicesLoading] = useState(false)

  const supabase = createClient()

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true)
    try {
      const response = await fetch('/api/stripe/invoices')
      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
        setUpcomingInvoice(data.upcomingInvoice)
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err)
    } finally {
      setInvoicesLoading(false)
    }
  }, [])

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

      const companyState = {
        ...companyData,
        billing_plan: companyData.billing_plan || 'free',
        actual_plan: companyData.actual_plan || 'free',
        contracts_used_this_period: companyData.contracts_used_this_period || 0,
        subscription_status: companyData.subscription_status || 'active',
      }
      setCompany(companyState)
      setUserCount(count || 1)

      // Fetch invoices if customer has Stripe
      if (companyState.stripe_customer_id) {
        fetchInvoices()
      }
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
        // Get Endorsely referral ID for affiliate tracking
        const endorselyReferral = (window as any).endorsely_referral || null

        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId, endorselyReferral }),
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

      {/* Next Invoice Breakdown */}
      {company.stripe_subscription_id && company.billing_plan !== 'free' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Receipt className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Next Invoice Estimate</h2>
              <p className="text-sm text-gray-500">
                {company.billing_period_start && (
                  <>
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Billing period: {new Date(company.billing_period_start).toLocaleDateString()} -{' '}
                    {new Date(new Date(company.billing_period_start).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Base Subscription */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{billingPlan.name} Plan (Monthly)</span>
              </div>
              <span className="font-medium text-gray-900">{formatPrice(billingPlan.monthlyPrice)}</span>
            </div>

            {/* Extra Seats */}
            {usage.users.extra > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    Extra Seats ({usage.users.extra} × {formatPrice(currentPlan.limits.overagePricing.extraSeatPrice)}/mo)
                  </span>
                </div>
                <span className="font-medium text-gray-900">{formatPrice(usage.users.extraCost)}</span>
              </div>
            )}

            {/* Contract Overages */}
            {usage.contracts.extra > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    Extra Contracts ({usage.contracts.extra} × {formatPrice(currentPlan.limits.overagePricing.extraContractPrice)})
                  </span>
                </div>
                <span className="font-medium text-gray-900">{formatPrice(usage.contracts.extraCost)}</span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-3">
              <span className="text-lg font-semibold text-gray-900">Estimated Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(
                  billingPlan.monthlyPrice +
                  usage.users.extraCost +
                  usage.contracts.extraCost
                )}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              * Contract overages are charged at the end of each billing period. Extra seats are charged monthly.
              Actual invoice may vary based on prorated charges or credits.
            </p>
          </div>
        </div>
      )}

      {/* Invoices Section */}
      {company.stripe_customer_id && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
                <p className="text-sm text-gray-500">View and download your billing history</p>
              </div>
            </div>
            {invoicesLoading && (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Upcoming Invoice from Stripe */}
          {upcomingInvoice && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Upcoming Invoice</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      Due {upcomingInvoice.next_payment_attempt
                        ? new Date(upcomingInvoice.next_payment_attempt * 1000).toLocaleDateString()
                        : 'at end of period'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Period: {new Date(upcomingInvoice.period_start * 1000).toLocaleDateString()} - {new Date(upcomingInvoice.period_end * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      ${(upcomingInvoice.total / 100).toFixed(2)}
                    </p>
                    {upcomingInvoice.tax !== null && upcomingInvoice.tax > 0 && (
                      <p className="text-xs text-gray-500">
                        Includes ${(upcomingInvoice.tax / 100).toFixed(2)} tax
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-3 space-y-1">
                  {upcomingInvoice.lines.map((line, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{line.description || 'Subscription'}</span>
                      <span className="text-gray-900">${(line.amount / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Past Invoices */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Invoice History</h3>
            {invoices.length === 0 ? (
              <p className="text-sm text-gray-500">No invoices yet.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {invoice.number || invoice.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(invoice.created * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${(invoice.amount_paid / 100).toFixed(2)}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            invoice.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : invoice.status === 'open'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {invoice.hosted_invoice_url && (
                          <a
                            href={invoice.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="View Invoice"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {invoice.invoice_pdf && (
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(PLANS).filter(plan => plan.id !== 'admin').map((plan) => {
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
