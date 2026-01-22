'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus,
  Send,
  CheckCircle2,
  Sparkles,
  Webhook,
  AlertCircle,
  RefreshCw,
  Filter,
  Building2,
  Mail,
  Clock,
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'signup' | 'contract_sent' | 'contract_completed' | 'plan_changed' | 'ai_generation' | 'webhook'
  description: string
  metadata: Record<string, unknown>
  created_at: string
  user_email?: string
  company_name?: string
}

const activityIcons: Record<string, React.ElementType> = {
  signup: UserPlus,
  contract_sent: Send,
  contract_completed: CheckCircle2,
  ai_generation: Sparkles,
  webhook: Webhook,
  plan_changed: Building2,
}

const activityColors: Record<string, string> = {
  signup: 'bg-green-100 text-green-600',
  contract_sent: 'bg-blue-100 text-blue-600',
  contract_completed: 'bg-emerald-100 text-emerald-600',
  ai_generation: 'bg-pink-100 text-pink-600',
  webhook: 'bg-purple-100 text-purple-600',
  plan_changed: 'bg-amber-100 text-amber-600',
}

const activityLabels: Record<string, string> = {
  signup: 'New Signup',
  contract_sent: 'Contract Sent',
  contract_completed: 'Contract Completed',
  ai_generation: 'AI Generation',
  webhook: 'Webhook Event',
  plan_changed: 'Plan Changed',
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('')
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchActivity()
  }, [filter])

  async function fetchActivity() {
    setLoading(true)
    setError(null)
    try {
      const url = filter
        ? `/api/admin/activity?type=${filter}`
        : '/api/admin/activity'
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch activity')
      const result = await response.json()
      setActivities(result.activities)
      setTotal(result.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }

  function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-gray-600 mt-1">Recent system activity and events</p>
        </div>
        <button
          onClick={fetchActivity}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 mr-2">Filter:</span>
          <FilterButton
            active={filter === ''}
            onClick={() => setFilter('')}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === 'signup'}
            onClick={() => setFilter('signup')}
          >
            Signups
          </FilterButton>
          <FilterButton
            active={filter === 'contract_sent'}
            onClick={() => setFilter('contract_sent')}
          >
            Contracts Sent
          </FilterButton>
          <FilterButton
            active={filter === 'contract_completed'}
            onClick={() => setFilter('contract_completed')}
          >
            Completed
          </FilterButton>
          <FilterButton
            active={filter === 'ai_generation'}
            onClick={() => setFilter('ai_generation')}
          >
            AI Usage
          </FilterButton>
          <FilterButton
            active={filter === 'webhook'}
            onClick={() => setFilter('webhook')}
          >
            Webhooks
          </FilterButton>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Activity List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No activity found</p>
            {filter && (
              <button
                onClick={() => setFilter('')}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-600">
                Showing {activities.length} of {total} activities
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type] || AlertCircle
                const colorClass = activityColors[activity.type] || 'bg-gray-100 text-gray-600'
                const label = activityLabels[activity.type] || activity.type

                return (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full">
                                {label}
                              </span>
                              {activity.company_name && (
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {activity.company_name}
                                </span>
                              )}
                              {activity.user_email && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {activity.user_email}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>

                        {/* Metadata (expandable) */}
                        {Object.keys(activity.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                              View details
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}
