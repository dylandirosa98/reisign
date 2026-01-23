'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLANS, formatPrice, getUsageSummary, type PlanTier } from '@/lib/plans'
import {
  Bell,
  User,
  Building2,
  Check,
  AlertTriangle,
  FileText,
  Users,
  Crown,
  Zap,
  X,
  Loader2,
  CreditCard,
  Receipt,
  Calendar,
  ExternalLink,
} from 'lucide-react'

interface UserData {
  id: string
  email: string
  full_name: string | null
  role: string | null
  company_id: string
}

interface CompanyData {
  id: string
  name: string
  billing_plan: PlanTier
  actual_plan: PlanTier
  contracts_used_this_period: number
  billing_period_start: string | null
  subscription_status: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  overage_behavior: 'auto_charge' | 'warn_each'
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [overageBehavior, setOverageBehavior] = useState<'auto_charge' | 'warn_each'>('warn_each')

  // Plan change modal
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null)
  const [changingPlan, setChangingPlan] = useState(false)
  const [openingPortal, setOpeningPortal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    try {
      const response = await fetch('/api/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setUser(data.user)
      setCompany(data.company)
      setUserCount(data.userCount)

      // Set form values
      setFullName(data.user.full_name || '')
      setCompanyName(data.company.name || '')
      setOverageBehavior(data.company.overage_behavior || 'warn_each')
    } catch (error) {
      console.error('Error fetching settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    if (!user) return

    setSaving(true)
    setMessage(null)

    try {
      // Update user profile via Supabase
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCompanySettings() {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          overage_behavior: overageBehavior,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setMessage({ type: 'success', text: 'Settings updated successfully' })
      fetchSettings() // Refresh data
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  async function handleOpenStripePortal() {
    setOpeningPortal(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: 'Failed to open billing portal' })
      }
    } catch (error) {
      console.error('Error opening portal:', error)
      setMessage({ type: 'error', text: 'Failed to open billing portal' })
    } finally {
      setOpeningPortal(false)
    }
  }

  async function handleChangePlan() {
    if (!selectedPlan) return

    setChangingPlan(true)
    try {
      // For paid plans, redirect to Stripe checkout
      if (selectedPlan !== 'free') {
        const response = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan }),
        })

        const data = await response.json()

        if (!response.ok) {
          // If Stripe is not configured, fall back to test mode
          if (response.status === 503) {
            // Fall back to test mode
            const testResponse = await fetch('/api/settings/plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: selectedPlan }),
            })
            const testData = await testResponse.json()
            if (!testResponse.ok) throw new Error(testData.error)
            setMessage({ type: 'success', text: testData.message })
            setShowPlanModal(false)
            setSelectedPlan(null)
            fetchSettings()
            return
          }
          throw new Error(data.error)
        }

        // Redirect to Stripe checkout
        if (data.url) {
          window.location.href = data.url
          return
        }
      } else {
        // Downgrading to free - use test mode for now (or Stripe portal if configured)
        if (company?.stripe_customer_id) {
          // Has Stripe - redirect to customer portal to cancel
          const response = await fetch('/api/stripe/portal', {
            method: 'POST',
          })
          const data = await response.json()
          if (data.url) {
            window.location.href = data.url
            return
          }
        }
        // Fall back to test mode
        const response = await fetch('/api/settings/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: selectedPlan }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        setMessage({ type: 'success', text: data.message })
      }

      setShowPlanModal(false)
      setSelectedPlan(null)
      fetchSettings()
    } catch (error) {
      console.error('Error changing plan:', error)
      setMessage({ type: 'error', text: 'Failed to change plan' })
    } finally {
      setChangingPlan(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-600)]" />
      </div>
    )
  }

  if (!company || !user) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">Failed to load settings. Please try again.</p>
      </div>
    )
  }

  const currentPlan = PLANS[company.actual_plan] || PLANS.free
  const usage = getUsageSummary(
    company.billing_plan,
    company.actual_plan,
    company.contracts_used_this_period,
    userCount
  )

  const isManager = user.role === 'manager' || user.role === 'admin'

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Settings</h1>
        <p className="text-sm text-[var(--gray-600)]">
          Manage your account, subscription, and preferences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Profile Settings */}
      <div className="bg-white border border-[var(--gray-200)] rounded-lg">
        <div className="px-4 py-3 border-b border-[var(--gray-200)] flex items-center gap-2">
          <User className="h-5 w-5 text-[var(--gray-500)]" />
          <h2 className="font-semibold text-[var(--gray-900)]">Profile</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--gray-700)]">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--gray-700)]">
                Email
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg bg-[var(--gray-50)] text-[var(--gray-500)]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Profile
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="bg-white border border-[var(--gray-200)] rounded-lg">
        <div className="px-4 py-3 border-b border-[var(--gray-200)] flex items-center gap-2">
          <Crown className="h-5 w-5 text-[var(--gray-500)]" />
          <h2 className="font-semibold text-[var(--gray-900)]">Subscription</h2>
        </div>
        <div className="p-4">
          {/* Current Plan */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[var(--gray-900)]">
                  {currentPlan.name} Plan
                </h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                  {company.subscription_status}
                </span>
              </div>
              <p className="text-sm text-[var(--gray-600)] mt-1">
                {currentPlan.description}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[var(--gray-900)]">
                {formatPrice(currentPlan.monthlyPrice)}
                <span className="text-sm font-normal text-[var(--gray-500)]">/mo</span>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--gray-50)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-[var(--gray-500)]" />
                <span className="text-sm font-medium text-[var(--gray-700)]">
                  Contracts This Period
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-[var(--gray-900)]">
                  {usage.contracts.used}
                </span>
                <span className="text-[var(--gray-500)] mb-0.5">
                  / {usage.contracts.limit !== null ? usage.contracts.limit : '∞'}
                </span>
              </div>
              {usage.contracts.extra > 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  {usage.contracts.extra} overage ({formatPrice(usage.contracts.extraCost)})
                </p>
              )}
            </div>
            <div className="bg-[var(--gray-50)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-[var(--gray-500)]" />
                <span className="text-sm font-medium text-[var(--gray-700)]">
                  Team Members
                </span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-[var(--gray-900)]">
                  {usage.users.current}
                </span>
                <span className="text-[var(--gray-500)] mb-0.5">
                  / {usage.users.limit}
                </span>
              </div>
              {usage.users.extra > 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  {usage.users.extra} extra seat ({formatPrice(usage.users.extraCost)}/mo)
                </p>
              )}
            </div>
          </div>

          {/* Next Invoice Breakdown */}
          {company.stripe_subscription_id && company.billing_plan !== 'free' && (
            <div className="bg-[var(--gray-50)] rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-[var(--gray-500)]" />
                <span className="text-sm font-medium text-[var(--gray-700)]">
                  Next Invoice Estimate
                </span>
                {company.billing_period_start && (
                  <span className="text-xs text-[var(--gray-400)] ml-auto flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due ~{new Date(new Date(company.billing_period_start).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {/* Base Plan */}
                <div className="flex justify-between">
                  <span className="text-[var(--gray-600)]">{currentPlan.name} Plan</span>
                  <span className="font-medium text-[var(--gray-900)]">{formatPrice(currentPlan.monthlyPrice)}</span>
                </div>

                {/* Extra Seats */}
                {usage.users.extra > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-600)]">
                      Extra Seats ({usage.users.extra} × {formatPrice(currentPlan.limits.overagePricing.extraSeatPrice)})
                    </span>
                    <span className="font-medium text-[var(--gray-900)]">{formatPrice(usage.users.extraCost)}</span>
                  </div>
                )}

                {/* Contract Overages */}
                {usage.contracts.extra > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--gray-600)]">
                      Contract Overages ({usage.contracts.extra} × {formatPrice(currentPlan.limits.overagePricing.extraContractPrice)})
                    </span>
                    <span className="font-medium text-[var(--gray-900)]">{formatPrice(usage.contracts.extraCost)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between pt-2 border-t border-[var(--gray-200)]">
                  <span className="font-semibold text-[var(--gray-900)]">Estimated Total</span>
                  <span className="font-bold text-[var(--gray-900)]">
                    {formatPrice(
                      currentPlan.monthlyPrice +
                      usage.users.extraCost +
                      usage.contracts.extraCost
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Change Plan Button */}
          {isManager && (
            <button
              onClick={() => setShowPlanModal(true)}
              className="w-full py-3 border-2 border-dashed border-[var(--gray-300)] rounded-lg text-[var(--gray-600)] hover:border-[var(--primary-500)] hover:text-[var(--primary-600)] transition-colors"
            >
              Change Plan
            </button>
          )}

          {/* Stripe Status Notice */}
          {company.stripe_customer_id ? (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Billing Active</p>
                    <p className="text-sm text-green-700">
                      Your subscription is managed through Stripe.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href="/dashboard/settings/billing"
                    className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Receipt className="h-4 w-4" />
                    View Invoices
                  </a>
                  <button
                    onClick={handleOpenStripePortal}
                    disabled={openingPortal}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {openingPortal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Manage Billing
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Zap className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Free Trial</p>
                  <p className="text-sm text-blue-700">
                    Upgrade to unlock more features. You&apos;ll be redirected to secure Stripe checkout.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Billing Preferences (Managers Only) */}
      {isManager && (
        <div className="bg-white border border-[var(--gray-200)] rounded-lg">
          <div className="px-4 py-3 border-b border-[var(--gray-200)] flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--gray-500)]" />
            <h2 className="font-semibold text-[var(--gray-900)]">Billing Preferences</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* Overage Behavior */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-[var(--gray-700)]">
                Contract Overage Handling
              </label>
              <p className="text-sm text-[var(--gray-500)]">
                Choose how to handle contracts that exceed your monthly limit
              </p>

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-[var(--gray-200)] rounded-lg cursor-pointer hover:bg-[var(--gray-50)]">
                  <input
                    type="radio"
                    name="overageBehavior"
                    value="auto_charge"
                    checked={overageBehavior === 'auto_charge'}
                    onChange={() => setOverageBehavior('auto_charge')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-[var(--gray-900)]">
                      Auto-charge for overages
                    </div>
                    <p className="text-sm text-[var(--gray-500)]">
                      Automatically charge the overage fee when creating contracts beyond your limit.
                      No interruption to your workflow.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-[var(--gray-200)] rounded-lg cursor-pointer hover:bg-[var(--gray-50)]">
                  <input
                    type="radio"
                    name="overageBehavior"
                    value="warn_each"
                    checked={overageBehavior === 'warn_each'}
                    onChange={() => setOverageBehavior('warn_each')}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-[var(--gray-900)]">
                      Warn before each overage contract
                    </div>
                    <p className="text-sm text-[var(--gray-500)]">
                      Show a confirmation dialog before creating each contract that exceeds your limit.
                      Helps control costs by reviewing each overage.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Team Member Overage Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Team Member Overages
                  </p>
                  <p className="text-sm text-blue-700">
                    Adding team members beyond your plan limit will always show a warning before
                    confirming. This cannot be changed to auto-charge.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveCompanySettings}
                disabled={saving}
                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Settings (Managers Only) */}
      {isManager && (
        <div className="bg-white border border-[var(--gray-200)] rounded-lg">
          <div className="px-4 py-3 border-b border-[var(--gray-200)] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--gray-500)]" />
            <h2 className="font-semibold text-[var(--gray-900)]">Company</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--gray-700)]">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                placeholder="Your company name"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSaveCompanySettings}
                disabled={saving}
                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Company
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--gray-200)]">
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">
                Change Plan
              </h2>
              <button
                onClick={() => {
                  setShowPlanModal(false)
                  setSelectedPlan(null)
                }}
                className="p-2 hover:bg-[var(--gray-100)] rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Plan Options */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {Object.values(PLANS)
                  .filter((plan) => plan.id !== 'admin')
                  .map((plan) => {
                    const isCurrent = company.billing_plan === plan.id
                    const isSelected = selectedPlan === plan.id

                    return (
                      <div
                        key={plan.id}
                        onClick={() => !isCurrent && setSelectedPlan(plan.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isCurrent
                            ? 'border-green-500 bg-green-50 cursor-default'
                            : isSelected
                            ? 'border-[var(--primary-500)] bg-[var(--primary-50)]'
                            : 'border-[var(--gray-200)] hover:border-[var(--gray-300)]'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-[var(--gray-900)]">
                            {plan.name}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                              Current
                            </span>
                          )}
                          {isSelected && !isCurrent && (
                            <Check className="h-5 w-5 text-[var(--primary-600)]" />
                          )}
                        </div>
                        <p className="text-sm text-[var(--gray-500)] mb-3">
                          {plan.description}
                        </p>
                        <div className="mb-3">
                          <span className="text-2xl font-bold text-[var(--gray-900)]">
                            {formatPrice(plan.monthlyPrice)}
                          </span>
                          <span className="text-[var(--gray-500)]">/mo</span>
                        </div>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-center gap-2 text-[var(--gray-600)]">
                            <Check className="h-4 w-4 text-green-500" />
                            {plan.limits.contractsPerMonth !== null
                              ? `${plan.limits.contractsPerMonth} contracts/month`
                              : 'Unlimited contracts'}
                          </li>
                          <li className="flex items-center gap-2 text-[var(--gray-600)]">
                            <Check className="h-4 w-4 text-green-500" />
                            {plan.limits.maxUsers} team member{plan.limits.maxUsers !== 1 ? 's' : ''}
                          </li>
                          {plan.limits.features.aiTemplateGeneration && (
                            <li className="flex items-center gap-2 text-[var(--gray-600)]">
                              <Zap className="h-4 w-4 text-green-500" />
                              AI template generation
                            </li>
                          )}
                        </ul>
                      </div>
                    )
                  })}
              </div>

              {/* Confirmation */}
              {selectedPlan && (
                <div className={`p-4 rounded-lg mb-4 ${
                  selectedPlan === 'free'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {selectedPlan === 'free' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      {selectedPlan === 'free' ? (
                        <>
                          <p className="text-sm font-medium text-amber-800">
                            Downgrade to Free
                          </p>
                          <p className="text-sm text-amber-700">
                            {company?.stripe_customer_id
                              ? 'You will be redirected to manage your subscription cancellation.'
                              : 'Your plan will be changed to Free immediately.'}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-blue-800">
                            Upgrade to {PLANS[selectedPlan].name}
                          </p>
                          <p className="text-sm text-blue-700">
                            You&apos;ll be redirected to secure Stripe checkout to complete your
                            subscription at {formatPrice(PLANS[selectedPlan].monthlyPrice)}/month.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--gray-200)]">
              <button
                onClick={() => {
                  setShowPlanModal(false)
                  setSelectedPlan(null)
                }}
                className="px-4 py-2 text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                disabled={!selectedPlan || changingPlan}
                className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 flex items-center gap-2"
              >
                {changingPlan && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedPlan === 'free' ? 'Confirm Downgrade' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
