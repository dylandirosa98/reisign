import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Clock, CheckCircle, Eye, Send } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's company_id (using admin client to bypass RLS)
  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = (userData as { company_id: string | null } | null)?.company_id

  if (!companyId) {
    return <div>No company found</div>
  }

  // Get contract stats (using admin client)
  const { data: contractsData } = await adminSupabase
    .from('contracts')
    .select('status')
    .eq('company_id', companyId)

  const contracts = contractsData as { status: string }[] | null

  const stats = {
    total: contracts?.length || 0,
    draft: contracts?.filter(c => c.status === 'draft').length || 0,
    sent: contracts?.filter(c => c.status === 'sent').length || 0,
    viewed: contracts?.filter(c => c.status === 'viewed').length || 0,
    completed: contracts?.filter(c => c.status === 'completed').length || 0,
  }

  // Get recent contracts (using admin client)
  const { data: recentContractsData } = await adminSupabase
    .from('contracts')
    .select(`
      *,
      property:properties(address, city, state)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(5)

  type RecentContract = {
    id: string
    status: string
    buyer_name: string
    price: number
    created_at: string | null
    property: { address: string; city: string | null; state: string | null } | null
  }

  const recentContracts = recentContractsData as RecentContract[] | null

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Dashboard</h1>
          <p className="text-sm text-[var(--gray-600)]">Overview of your contract activity</p>
        </div>
        <Link href="/dashboard/contracts/new">
          <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Contracts"
          value={stats.total}
          icon={<FileText className="h-5 w-5 text-[var(--gray-500)]" />}
        />
        <StatCard
          title="Drafts"
          value={stats.draft}
          icon={<Clock className="h-5 w-5 text-[var(--gray-500)]" />}
        />
        <StatCard
          title="Awaiting Signature"
          value={stats.sent + stats.viewed}
          icon={<Send className="h-5 w-5 text-[var(--gray-500)]" />}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="h-5 w-5 text-[var(--success-700)]" />}
        />
      </div>

      {/* Recent Contracts */}
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-4 border-b border-[var(--gray-200)]">
          <h2 className="text-lg font-semibold text-[var(--gray-900)]">Recent Contracts</h2>
          <p className="text-sm text-[var(--gray-600)]">Your most recent contract activity</p>
        </div>
        <div className="divide-y divide-[var(--gray-200)]">
          {recentContracts && recentContracts.length > 0 ? (
            recentContracts.map((contract) => (
              <Link
                key={contract.id}
                href={`/dashboard/contracts/${contract.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--gray-100)] transition-colors"
              >
                <div className="space-y-1">
                  <p className="font-medium text-[var(--gray-900)]">
                    {contract.property?.address || 'No address'}
                    {contract.property?.city && `, ${contract.property.city}`}
                    {contract.property?.state && `, ${contract.property.state}`}
                  </p>
                  <p className="text-sm text-[var(--gray-600)]">
                    {contract.buyer_name} &bull; ${contract.price.toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={contract.status} />
              </Link>
            ))
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No contracts yet</h3>
              <p className="text-sm text-[var(--gray-600)] mb-4">Get started by creating your first contract</p>
              <Link href="/dashboard/contracts/new">
                <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
                  Create Contract
                </Button>
              </Link>
            </div>
          )}
        </div>
        {recentContracts && recentContracts.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--gray-200)]">
            <Link
              href="/dashboard/contracts"
              className="text-sm font-medium text-[var(--primary-700)] hover:underline"
            >
              View all contracts
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-[var(--gray-200)] rounded p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--gray-600)]">{title}</span>
        {icon}
      </div>
      <p className="text-2xl font-bold text-[var(--gray-900)]">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bgColor: string; textColor: string }> = {
    draft: {
      label: 'Draft',
      bgColor: 'var(--gray-100)',
      textColor: 'var(--gray-700)',
    },
    sent: {
      label: 'Sent',
      bgColor: 'var(--info-100)',
      textColor: 'var(--info-700)',
    },
    viewed: {
      label: 'Viewed',
      bgColor: 'var(--warning-100)',
      textColor: 'var(--warning-700)',
    },
    completed: {
      label: 'Completed',
      bgColor: 'var(--success-100)',
      textColor: 'var(--success-700)',
    },
    cancelled: {
      label: 'Cancelled',
      bgColor: 'var(--error-100)',
      textColor: 'var(--error-700)',
    },
  }

  const { label, bgColor, textColor } = config[status] || {
    label: status,
    bgColor: 'var(--gray-100)',
    textColor: 'var(--gray-700)',
  }

  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {label}
    </span>
  )
}
