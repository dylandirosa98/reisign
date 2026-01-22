'use client'

import { useState, useEffect } from 'react'
import { formatCents } from '@/lib/billing'
import {
  Building2,
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  Sparkles,
  CheckCircle2,
  Eye,
  Send,
  XCircle,
  FileEdit,
  AlertCircle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalCompanies: number
    totalUsers: number
    totalContracts: number
    totalContractsSent: number
    signupsThisWeek: number
    contractsThisWeek: number
    contractsThisMonth: number
    mrr: number
  }
  contractsByStatus: {
    draft: number
    sent: number
    viewed: number
    completed: number
    cancelled: number
  }
  signatureFunnel: {
    sent: number
    viewed: number
    completed: number
    completionRate: number
  }
  planDistribution: {
    plan: string
    count: number
    percentage: number
  }[]
  aiUsage: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
    estimatedCostThisMonth: number
  }
  monthlyStats: {
    month: string
    contracts_sent: number
    contracts_completed: number
    new_users: number
    new_companies: number
    ai_generations: number
    revenue: number
  }[]
  contractsByMonth: {
    month: string
    sent: number
    company_breakdown: {
      company_id: string
      company_name: string
      count: number
    }[]
  }[]
  topCompanies: {
    id: string
    name: string
    contracts_sent: number
    plan: string
  }[]
}

const planColors: Record<string, string> = {
  'Free': 'bg-gray-400',
  'Individual': 'bg-blue-500',
  'Small Team': 'bg-purple-500',
  'Business': 'bg-amber-500',
  'Admin': 'bg-red-500',
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/analytics')
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const result = await response.json()
      setData(result)
      // Select most recent month for detailed view
      if (result.contractsByMonth?.length > 0) {
        setSelectedMonth(result.contractsByMonth[result.contractsByMonth.length - 1].month)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error || 'Failed to load analytics'}
        </div>
      </div>
    )
  }

  const selectedMonthData = data.contractsByMonth.find((m) => m.month === selectedMonth)

  // Calculate max for bar chart scaling
  const maxContractsSent = Math.max(...data.monthlyStats.map((m) => m.contracts_sent), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">System-wide analytics and usage metrics</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          icon={Building2}
          label="Companies"
          value={data.overview.totalCompanies}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Users"
          value={data.overview.totalUsers}
          subtext={`+${data.overview.signupsThisWeek} this week`}
          color="green"
        />
        <StatCard
          icon={FileText}
          label="Contracts Sent"
          value={data.overview.totalContractsSent}
          subtext={`+${data.overview.contractsThisWeek} this week`}
          color="purple"
        />
        <StatCard
          icon={Send}
          label="This Month"
          value={data.overview.contractsThisMonth}
          subtext="contracts sent"
          color="indigo"
        />
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={formatCents(data.overview.mrr)}
          color="amber"
        />
        <StatCard
          icon={Sparkles}
          label="AI Generations"
          value={data.aiUsage.thisMonth}
          subtext={`$${data.aiUsage.estimatedCostThisMonth.toFixed(2)} est. cost`}
          color="pink"
        />
      </div>

      {/* Contracts by Month Chart + Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Contracts Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Contracts Sent by Month (Billing Metric)
          </h3>
          <div className="space-y-3">
            {data.monthlyStats.map((month) => (
              <div key={month.month} className="flex items-center gap-4">
                <div className="w-16 text-sm text-gray-600 font-medium">{month.month}</div>
                <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg transition-all duration-500"
                    style={{ width: `${(month.contracts_sent / maxContractsSent) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center px-3 text-sm font-medium">
                    {month.contracts_sent > 0 && (
                      <span className={month.contracts_sent > maxContractsSent * 0.3 ? 'text-white' : 'text-gray-700'}>
                        {month.contracts_sent}
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-20 text-right text-sm text-gray-500">
                  {month.contracts_completed} done
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Contract Status</h3>
          <div className="space-y-4">
            <StatusRow icon={FileEdit} label="Drafts" count={data.contractsByStatus.draft} color="gray" />
            <StatusRow icon={Send} label="Sent" count={data.contractsByStatus.sent} color="blue" />
            <StatusRow icon={Eye} label="Viewed" count={data.contractsByStatus.viewed} color="yellow" />
            <StatusRow icon={CheckCircle2} label="Completed" count={data.contractsByStatus.completed} color="green" />
            <StatusRow icon={XCircle} label="Cancelled" count={data.contractsByStatus.cancelled} color="red" />
          </div>

          {/* Signature Funnel */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Signature Funnel</h4>
            <div className="space-y-2">
              <FunnelRow label="Sent" value={data.signatureFunnel.sent} max={data.signatureFunnel.sent} />
              <FunnelRow label="Viewed" value={data.signatureFunnel.viewed} max={data.signatureFunnel.sent} />
              <FunnelRow label="Completed" value={data.signatureFunnel.completed} max={data.signatureFunnel.sent} />
            </div>
            <div className="mt-3 text-center">
              <span className="text-2xl font-bold text-green-600">{data.signatureFunnel.completionRate}%</span>
              <span className="text-sm text-gray-500 ml-2">completion rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown + Plan Distribution + AI Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Contract Breakdown by Company */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Breakdown</h3>
          <select
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 text-sm"
          >
            {data.contractsByMonth.map((m) => (
              <option key={m.month} value={m.month}>
                {m.month} ({m.sent} sent)
              </option>
            ))}
          </select>

          {selectedMonthData && (
            <div className="space-y-2">
              {selectedMonthData.company_breakdown.length > 0 ? (
                selectedMonthData.company_breakdown.slice(0, 8).map((company) => (
                  <div key={company.company_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700 truncate flex-1">{company.company_name}</span>
                    <span className="text-sm font-medium text-gray-900 ml-2">{company.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No contracts sent this month</p>
              )}
            </div>
          )}
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <div className="space-y-3">
            {data.planDistribution.map((plan) => (
              <div key={plan.plan} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{plan.plan}</span>
                  <span className="text-gray-500">{plan.count} ({plan.percentage}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${planColors[plan.plan] || 'bg-gray-400'}`}
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-pink-500" />
            AI Usage
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Today</span>
              <span className="text-lg font-semibold text-gray-900">{data.aiUsage.today}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="text-lg font-semibold text-gray-900">{data.aiUsage.thisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-lg font-semibold text-gray-900">{data.aiUsage.thisMonth}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-600">Total All Time</span>
              <span className="text-lg font-semibold text-gray-900">{data.aiUsage.total}</span>
            </div>
            <div className="mt-4 p-3 bg-pink-50 rounded-lg">
              <div className="text-xs text-pink-600 uppercase font-medium">Est. Cost This Month</div>
              <div className="text-xl font-bold text-pink-700">${data.aiUsage.estimatedCostThisMonth.toFixed(2)}</div>
              <div className="text-xs text-pink-500">~$0.01 per generation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Companies */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Top Companies (Last 30 Days)
        </h3>
        {data.topCompanies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 font-medium text-gray-500">#</th>
                  <th className="text-left py-2 font-medium text-gray-500">Company</th>
                  <th className="text-left py-2 font-medium text-gray-500">Plan</th>
                  <th className="text-right py-2 font-medium text-gray-500">Contracts Sent</th>
                </tr>
              </thead>
              <tbody>
                {data.topCompanies.map((company, index) => (
                  <tr key={company.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 text-gray-400">{index + 1}</td>
                    <td className="py-3 font-medium text-gray-900">{company.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        company.plan === 'Free' ? 'bg-gray-100 text-gray-700' :
                        company.plan === 'Individual' ? 'bg-blue-100 text-blue-700' :
                        company.plan === 'Small Team' ? 'bg-purple-100 text-purple-700' :
                        company.plan === 'Business' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {company.plan}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">{company.contracts_sent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm italic">No contract activity in the last 30 days</p>
        )}
      </div>

      {/* Growth Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Monthly Growth Trends</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-500">Month</th>
                <th className="text-right py-2 font-medium text-gray-500">Contracts Sent</th>
                <th className="text-right py-2 font-medium text-gray-500">Completed</th>
                <th className="text-right py-2 font-medium text-gray-500">New Users</th>
                <th className="text-right py-2 font-medium text-gray-500">New Companies</th>
                <th className="text-right py-2 font-medium text-gray-500">AI Generations</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyStats.map((month, index) => {
                const prevMonth = index > 0 ? data.monthlyStats[index - 1] : null
                const contractsGrowth = prevMonth && prevMonth.contracts_sent > 0
                  ? Math.round(((month.contracts_sent - prevMonth.contracts_sent) / prevMonth.contracts_sent) * 100)
                  : null

                return (
                  <tr key={month.month} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 font-medium text-gray-900">{month.month}</td>
                    <td className="py-3 text-right">
                      <span className="font-semibold">{month.contracts_sent}</span>
                      {contractsGrowth !== null && (
                        <span className={`ml-2 text-xs ${contractsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {contractsGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
                          {Math.abs(contractsGrowth)}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right text-gray-600">{month.contracts_completed}</td>
                    <td className="py-3 text-right text-gray-600">{month.new_users}</td>
                    <td className="py-3 text-right text-gray-600">{month.new_companies}</td>
                    <td className="py-3 text-right text-gray-600">{month.ai_generations}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Component helpers
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  color: 'blue' | 'green' | 'purple' | 'amber' | 'pink' | 'indigo'
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
    pink: 'bg-pink-100 text-pink-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{label}</div>
          {subtext && <div className="text-xs text-gray-400">{subtext}</div>}
        </div>
      </div>
    </div>
  )
}

function StatusRow({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ElementType
  label: string
  count: number
  color: 'gray' | 'blue' | 'yellow' | 'green' | 'red'
}) {
  const colors = {
    gray: 'text-gray-500',
    blue: 'text-blue-500',
    yellow: 'text-yellow-500',
    green: 'text-green-500',
    red: 'text-red-500',
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colors[color]}`} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{count}</span>
    </div>
  )
}

function FunnelRow({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
