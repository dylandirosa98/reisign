'use client'

import { useState, useEffect } from 'react'
import { PLANS, formatPrice, type PlanTier } from '@/lib/plans'
import { formatCents } from '@/lib/billing'
import {
  Building2,
  Users,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  Edit2,
  Save,
  AlertCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Receipt,
} from 'lucide-react'

interface BillingDetails {
  billingPlan: PlanTier
  actualPlan: PlanTier
  billingInterval: 'monthly' | 'yearly'
  contractsUsed: number
  contractsAllowed: number | null
  extraContracts: number
  usersCount: number
  usersAllowed: number
  extraSeats: number
  baseSubscriptionCost: number
  extraContractsCost: number
  extraSeatsCost: number
  estimatedNextInvoice: number
  billingPeriodStart: string | null
  nextBillingDate: string | null
  daysUntilNextBilling: number | null
}

interface BillingCycle {
  id: string
  cycleStart: string
  cycleEnd: string
  planAtCycleStart: PlanTier
  baseAmount: number
  extraSeatsCount: number
  extraSeatsAmount: number
  extraContractsCount: number
  extraContractsAmount: number
  totalAmount: number
  status: 'pending' | 'paid' | 'failed'
  paidAt: string | null
}

interface CompanyWithBilling {
  id: string
  name: string
  createdAt: string | null
  subscriptionStatus: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  users: {
    id: string
    email: string
    full_name: string | null
    role: string | null
    is_system_admin: boolean
  }[]
  usersCount: number
  totalContracts: number
  billing: BillingDetails
  billingHistory: BillingCycle[]
}

export default function AdminAccountsPage() {
  const [companies, setCompanies] = useState<CompanyWithBilling[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [editingCompany, setEditingCompany] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    billing_plan: PlanTier
    actual_plan: PlanTier
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')

  useEffect(() => {
    fetchCompanies()
  }, [])

  async function fetchCompanies() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/accounts')
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }
      const data = await response.json()
      setCompanies(data)
    } catch (err) {
      console.error('Error fetching companies:', err)
      setError('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  async function updateCompanyPlan(companyId: string) {
    if (!editForm) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          billing_plan: editForm.billing_plan,
          actual_plan: editForm.actual_plan,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update company')
      }

      // Refresh data
      await fetchCompanies()
      setEditingCompany(null)
      setEditForm(null)
    } catch (err) {
      console.error('Error updating company:', err)
      alert('Failed to update company plan')
    } finally {
      setSaving(false)
    }
  }

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.users.some((u) =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
  )

  const getPlanBadgeColor = (plan: PlanTier) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-700'
      case 'individual':
        return 'bg-blue-100 text-blue-700'
      case 'team':
        return 'bg-purple-100 text-purple-700'
      case 'business':
        return 'bg-amber-100 text-amber-700'
      case 'admin':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'trialing':
        return 'bg-blue-100 text-blue-700'
      case 'past_due':
        return 'bg-red-100 text-red-700'
      case 'canceled':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
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

  // Calculate totals
  const totalMRR = companies.reduce((acc, c) => {
    if (c.billing.billingPlan === 'free') return acc
    return acc + (c.billing.billingInterval === 'yearly'
      ? Math.round(PLANS[c.billing.billingPlan].yearlyPrice / 12)
      : PLANS[c.billing.billingPlan].monthlyPrice)
  }, 0)

  const totalPendingOverages = companies.reduce((acc, c) => {
    return acc + c.billing.extraContractsCost + c.billing.extraSeatsCost
  }, 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
        <p className="text-gray-600 mt-1">
          Manage all company accounts, plans, and billing
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{companies.length}</div>
              <div className="text-sm text-gray-500">Total Companies</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {companies.reduce((acc, c) => acc + c.usersCount, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {companies.reduce((acc, c) => acc + c.totalContracts, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Contracts</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatCents(totalMRR)}</div>
              <div className="text-sm text-gray-500">Monthly Revenue</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatCents(totalPendingOverages)}</div>
              <div className="text-sm text-gray-500">Pending Overages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by company name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Companies List */}
      <div className="space-y-4">
        {filteredCompanies.map((company) => (
          <div key={company.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Company Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    {expandedCompany === company.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{company.name}</span>
                      {company.billing.actualPlan !== company.billing.billingPlan && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Override
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {company.usersCount} user{company.usersCount !== 1 ? 's' : ''} •{' '}
                      {company.totalContracts} total contracts
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Plan Badges */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Billing</div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPlanBadgeColor(company.billing.billingPlan)}`}>
                        {PLANS[company.billing.billingPlan]?.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Access</div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPlanBadgeColor(company.billing.actualPlan)}`}>
                        {PLANS[company.billing.actualPlan]?.name}
                      </span>
                    </div>
                  </div>

                  {/* Usage Summary */}
                  <div className="text-right min-w-[140px]">
                    <div className={`text-sm font-medium ${company.billing.extraContracts > 0 ? 'text-amber-600' : ''}`}>
                      {company.billing.contractsUsed}/{company.billing.contractsAllowed ?? '∞'} contracts
                      {company.billing.extraContracts > 0 && <span className="text-xs ml-1">+{company.billing.extraContracts}</span>}
                    </div>
                    <div className={`text-sm font-medium ${company.billing.extraSeats > 0 ? 'text-amber-600' : ''}`}>
                      {company.billing.usersCount}/{company.billing.usersAllowed} seats
                      {company.billing.extraSeats > 0 && <span className="text-xs ml-1">+{company.billing.extraSeats}</span>}
                    </div>
                  </div>

                  {/* Next Invoice */}
                  <div className="text-right min-w-[100px]">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCents(company.billing.estimatedNextInvoice)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.billing.daysUntilNextBilling !== null
                        ? `in ${company.billing.daysUntilNextBilling} days`
                        : 'next invoice'}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(company.subscriptionStatus)}`}>
                    {company.subscriptionStatus}
                  </span>

                  {/* Edit Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (editingCompany === company.id) {
                        setEditingCompany(null)
                        setEditForm(null)
                      } else {
                        setEditingCompany(company.id)
                        setEditForm({
                          billing_plan: company.billing.billingPlan,
                          actual_plan: company.billing.actualPlan,
                        })
                      }
                    }}
                    className="p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Edit Form */}
              {editingCompany === company.id && (
                <div className="mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-end gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Billing Plan</label>
                      <select
                        value={editForm?.billing_plan}
                        onChange={(e) => setEditForm((prev) => ({ ...prev!, billing_plan: e.target.value as PlanTier }))}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {Object.values(PLANS).filter(p => p.id !== 'admin').map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({formatPrice(plan.monthlyPrice)}/mo)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Actual Access</label>
                      <select
                        value={editForm?.actual_plan}
                        onChange={(e) => setEditForm((prev) => ({ ...prev!, actual_plan: e.target.value as PlanTier }))}
                        className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {Object.values(PLANS).map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}{plan.id === 'admin' ? ' (System Only)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => updateCompanyPlan(company.id)}
                      disabled={saving}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingCompany(null); setEditForm(null) }}
                      className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expanded Details */}
            {expandedCompany === company.id && (
              <div className="border-t border-gray-200">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                  >
                    Billing Details
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                  >
                    Billing History
                  </button>
                </div>

                {activeTab === 'details' ? (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Usage This Period */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Usage This Period
                        </h4>
                        <div className="space-y-3">
                          {/* Contracts Usage */}
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Contracts</span>
                              <span className={`text-sm font-medium ${company.billing.extraContracts > 0 ? 'text-amber-600' : ''}`}>
                                {company.billing.contractsUsed} / {company.billing.contractsAllowed ?? '∞'}
                                {company.billing.extraContracts > 0 && (
                                  <span className="ml-1 text-xs">({company.billing.extraContracts} over)</span>
                                )}
                              </span>
                            </div>
                            {company.billing.contractsAllowed !== null && (
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${company.billing.extraContracts > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(100, (company.billing.contractsUsed / company.billing.contractsAllowed) * 100)}%` }}
                                />
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-2 text-xs">
                              <span className="text-gray-500">
                                Overage rate: {PLANS[company.billing.billingPlan]?.limits.overagePricing.extraContractPrice > 0
                                  ? formatCents(PLANS[company.billing.billingPlan].limits.overagePricing.extraContractPrice) + '/contract'
                                  : company.billing.billingPlan === 'free' ? 'Must upgrade' : 'N/A'}
                              </span>
                              {company.billing.extraContracts > 0 && (
                                <span className="text-amber-600 font-medium">
                                  +{formatCents(company.billing.extraContractsCost)} this cycle
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Seats Usage */}
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm text-gray-600">Team Seats</span>
                              <span className={`text-sm font-medium ${company.billing.extraSeats > 0 ? 'text-amber-600' : ''}`}>
                                {company.billing.usersCount} / {company.billing.usersAllowed}
                                {company.billing.extraSeats > 0 && (
                                  <span className="ml-1 text-xs">({company.billing.extraSeats} over)</span>
                                )}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${company.billing.extraSeats > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, (company.billing.usersCount / company.billing.usersAllowed) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs">
                              <span className="text-gray-500">
                                Overage rate: {PLANS[company.billing.billingPlan]?.limits.overagePricing.extraSeatPrice > 0
                                  ? formatCents(PLANS[company.billing.billingPlan].limits.overagePricing.extraSeatPrice) + '/seat/mo'
                                  : 'Not allowed'}
                              </span>
                              {company.billing.extraSeats > 0 && (
                                <span className="text-amber-600 font-medium">
                                  +{formatCents(company.billing.extraSeatsCost)}/mo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Estimated Next Invoice */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          Estimated Next Invoice
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {PLANS[company.billing.billingPlan]?.name} Plan
                              {company.billing.billingInterval === 'yearly' ? ' (Annual)' : ''}
                            </span>
                            <span>{formatCents(company.billing.baseSubscriptionCost)}</span>
                          </div>
                          {company.billing.extraContractsCost > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Extra Contracts ({company.billing.extraContracts})</span>
                              <span className="text-amber-600">+{formatCents(company.billing.extraContractsCost)}</span>
                            </div>
                          )}
                          {company.billing.extraSeatsCost > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Extra Seats ({company.billing.extraSeats})</span>
                              <span className="text-amber-600">+{formatCents(company.billing.extraSeatsCost)}</span>
                            </div>
                          )}
                          <div className="border-t border-gray-200 pt-2 mt-2">
                            <div className="flex justify-between font-medium">
                              <span>Total</span>
                              <span>{formatCents(company.billing.estimatedNextInvoice)}</span>
                            </div>
                          </div>
                          {company.billing.nextBillingDate && (
                            <div className="text-xs text-gray-500 mt-2">
                              Due: {new Date(company.billing.nextBillingDate).toLocaleDateString()}
                              {company.billing.daysUntilNextBilling !== null && (
                                <span> ({company.billing.daysUntilNextBilling} days)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Team Members */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Team Members
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {company.users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name || 'No name'}
                                  {user.is_system_admin && (
                                    <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Admin</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                              <span className="text-xs text-gray-500 capitalize">{user.role || 'member'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Account Info */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Created:</span>{' '}
                          {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                        <div>
                          <span className="text-gray-500">Billing Period Start:</span>{' '}
                          {company.billing.billingPeriodStart
                            ? new Date(company.billing.billingPeriodStart).toLocaleDateString()
                            : 'N/A'}
                        </div>
                        <div>
                          <span className="text-gray-500">Stripe Customer:</span>{' '}
                          {company.stripeCustomerId || 'Not connected'}
                        </div>
                        <div>
                          <span className="text-gray-500">Billing Interval:</span>{' '}
                          <span className="capitalize">{company.billing.billingInterval}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Billing History
                    </h4>
                    {company.billingHistory.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 text-gray-500 font-medium">Period</th>
                              <th className="text-left py-2 text-gray-500 font-medium">Plan</th>
                              <th className="text-right py-2 text-gray-500 font-medium">Base</th>
                              <th className="text-right py-2 text-gray-500 font-medium">Extra Contracts</th>
                              <th className="text-right py-2 text-gray-500 font-medium">Extra Seats</th>
                              <th className="text-right py-2 text-gray-500 font-medium">Total</th>
                              <th className="text-right py-2 text-gray-500 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {company.billingHistory.map((cycle) => (
                              <tr key={cycle.id} className="border-b border-gray-100">
                                <td className="py-2">
                                  {new Date(cycle.cycleStart).toLocaleDateString()} - {new Date(cycle.cycleEnd).toLocaleDateString()}
                                </td>
                                <td className="py-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPlanBadgeColor(cycle.planAtCycleStart)}`}>
                                    {PLANS[cycle.planAtCycleStart]?.name}
                                  </span>
                                </td>
                                <td className="text-right py-2">{formatCents(cycle.baseAmount)}</td>
                                <td className="text-right py-2">
                                  {cycle.extraContractsCount > 0 ? (
                                    <span className="text-amber-600">
                                      +{cycle.extraContractsCount} ({formatCents(cycle.extraContractsAmount)})
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="text-right py-2">
                                  {cycle.extraSeatsCount > 0 ? (
                                    <span className="text-amber-600">
                                      +{cycle.extraSeatsCount} ({formatCents(cycle.extraSeatsAmount)})
                                    </span>
                                  ) : '-'}
                                </td>
                                <td className="text-right py-2 font-medium">{formatCents(cycle.totalAmount)}</td>
                                <td className="text-right py-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    cycle.status === 'paid' ? 'bg-green-100 text-green-700' :
                                    cycle.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {cycle.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No billing history yet</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredCompanies.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            {searchQuery ? 'No companies match your search' : 'No companies found'}
          </div>
        )}
      </div>
    </div>
  )
}
