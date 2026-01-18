import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, FileText, MapPin } from 'lucide-react'

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-[var(--gray-100)] text-[var(--gray-700)]' },
  sent: { label: 'Sent', color: 'bg-[var(--info-100)] text-[var(--info-700)]' },
  viewed: { label: 'Viewed', color: 'bg-[var(--warning-100)] text-[var(--warning-700)]' },
  completed: { label: 'Completed', color: 'bg-[var(--success-100)] text-[var(--success-700)]' },
  cancelled: { label: 'Cancelled', color: 'bg-[var(--error-100)] text-[var(--error-700)]' },
}

export default async function PropertyDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = (userData as { company_id: string | null } | null)?.company_id

  if (!companyId) {
    return <div>No company found</div>
  }

  // Fetch property with all its contracts
  const { data: property, error } = await adminSupabase
    .from('properties')
    .select(`
      id,
      address,
      city,
      state,
      zip,
      created_at,
      contracts (
        id,
        status,
        seller_name,
        seller_email,
        price,
        created_at,
        sent_at,
        completed_at
      )
    `)
    .eq('id', id)
    .eq('company_id', companyId)
    .single()

  if (error || !property) {
    notFound()
  }

  type Contract = {
    id: string
    status: string | null
    seller_name: string
    seller_email: string
    price: number
    created_at: string | null
    sent_at: string | null
    completed_at: string | null
  }

  type Property = {
    id: string
    address: string
    city: string | null
    state: string | null
    zip: string | null
    created_at: string | null
    contracts: Contract[]
  }

  const typedProperty = property as Property

  const fullAddress = [
    typedProperty.address,
    typedProperty.city,
    typedProperty.state,
    typedProperty.zip
  ].filter(Boolean).join(', ')

  // Sort contracts by created_at descending
  const sortedContracts = [...(typedProperty.contracts || [])].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
    return dateB - dateA
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(price)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center text-sm text-[var(--gray-600)] hover:text-[var(--primary-700)] mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Properties
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[var(--primary-50)] flex items-center justify-center">
              <MapPin className="h-5 w-5 text-[var(--primary-700)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--gray-900)]">{typedProperty.address}</h1>
              <p className="text-sm text-[var(--gray-600)]">
                {typedProperty.city}, {typedProperty.state} {typedProperty.zip}
              </p>
            </div>
          </div>
        </div>
        <Link href={`/dashboard/contracts/new?property=${id}`}>
          <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = sortedContracts.filter(c => (c.status || 'draft') === status).length
          return (
            <div key={status} className="bg-white border border-[var(--gray-200)] rounded p-4">
              <div className="text-2xl font-bold text-[var(--gray-900)]">{count}</div>
              <div className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${config.color}`}>
                {config.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Contracts List */}
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="text-lg font-semibold text-[var(--gray-900)]">
            Contracts ({sortedContracts.length})
          </h2>
        </div>

        {sortedContracts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Seller</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Sent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-200)]">
              {sortedContracts.map((contract) => {
                const status = contract.status || 'draft'
                const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
                return (
                  <tr key={contract.id} className="hover:bg-[var(--gray-50)]">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/contracts/${contract.id}`}
                        className="font-medium text-[var(--gray-900)] hover:text-[var(--primary-700)]"
                      >
                        {contract.seller_name}
                      </Link>
                      <div className="text-xs text-[var(--gray-500)]">{contract.seller_email}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--gray-900)]">
                      {formatPrice(contract.price)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--gray-700)]">
                      {formatDate(contract.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--gray-700)]">
                      {formatDate(contract.sent_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--gray-700)]">
                      {formatDate(contract.completed_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No contracts yet</h3>
            <p className="text-sm text-[var(--gray-600)] mb-4">Create your first contract for this property</p>
            <Link href={`/dashboard/contracts/new?property=${id}`}>
              <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
                <Plus className="mr-2 h-4 w-4" />
                New Contract
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
