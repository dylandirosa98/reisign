import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Plus, FileText, PenTool } from 'lucide-react'
import { ContractTabs } from './contract-tabs'

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  const params = await searchParams

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = (userData as { company_id: string | null; role: string | null } | null)?.company_id
  const userRole = (userData as { company_id: string | null; role: string | null } | null)?.role
  const isManager = userRole === 'manager' || userRole === 'admin'

  if (!companyId) {
    return <div>No company found</div>
  }

  const { data: contracts } = await adminSupabase
    .from('contracts')
    .select(`
      *,
      property:properties(address, city, state)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  type CustomFields = {
    buyer_signature?: string
    buyer_initials?: string
    company_name?: string
    company_signer_name?: string
    company_email?: string
    company_phone?: string
  } | null

  type Contract = {
    id: string
    status: string
    buyer_name: string
    seller_name: string
    price: number
    created_at: string | null
    custom_fields: CustomFields
    property: { address: string; city: string | null; state: string | null } | null
  }

  const typedContracts = contracts as Contract[] | null

  // Filter contracts based on tab
  const activeTab = params.tab || 'all'

  // Unsigned contracts: draft contracts that don't have wholesaler signature yet (pending manager signature)
  const unsignedContracts = typedContracts?.filter(c =>
    !c.custom_fields?.buyer_signature &&
    c.status === 'draft'
  ) || []

  const filteredContracts = activeTab === 'unsigned'
    ? unsignedContracts
    : typedContracts

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Contracts</h1>
          <p className="text-sm text-[var(--gray-600)]">Manage your real estate contracts</p>
        </div>
        <Link href="/dashboard/contracts/new">
          <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Tabs for managers */}
      {isManager && (
        <ContractTabs
          activeTab={activeTab}
          unsignedCount={unsignedContracts.length}
        />
      )}

      <div className="bg-white border border-[var(--gray-200)] rounded">
        {filteredContracts && filteredContracts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Buyer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Seller</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Status</th>
                {activeTab === 'unsigned' && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Signature</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-200)]">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-[var(--gray-100)]">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/contracts/${contract.id}`} className="text-[var(--primary-700)] hover:underline font-medium">
                      {contract.property?.address || 'No address'}
                      {contract.property?.city && `, ${contract.property.city}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{contract.buyer_name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{contract.seller_name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">${contract.price.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={contract.status} />
                  </td>
                  {activeTab === 'unsigned' && (
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/contracts/${contract.id}?sign=true`}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[var(--warning-100)] text-[var(--warning-700)] rounded hover:bg-[var(--warning-200)] transition-colors"
                      >
                        <PenTool className="w-3 h-3" />
                        Sign Now
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
            {activeTab === 'unsigned' ? (
              <>
                <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No contracts pending signature</h3>
                <p className="text-sm text-[var(--gray-600)] mb-4">All draft contracts have been signed by a manager</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No contracts yet</h3>
                <p className="text-sm text-[var(--gray-600)] mb-4">Get started by creating your first contract</p>
                <Link href="/dashboard/contracts/new">
                  <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
                    Create Contract
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bgColor: string; textColor: string }> = {
    draft: { label: 'Draft', bgColor: 'var(--gray-100)', textColor: 'var(--gray-700)' },
    ready: { label: 'Ready to Send', bgColor: 'var(--primary-100)', textColor: 'var(--primary-700)' },
    sent: { label: 'Sent', bgColor: 'var(--info-100)', textColor: 'var(--info-700)' },
    viewed: { label: 'Viewed', bgColor: 'var(--warning-100)', textColor: 'var(--warning-700)' },
    seller_signed: { label: 'Seller Signed', bgColor: 'var(--success-100)', textColor: 'var(--success-700)' },
    buyer_pending: { label: 'Awaiting Buyer', bgColor: 'var(--info-100)', textColor: 'var(--info-700)' },
    completed: { label: 'Completed', bgColor: 'var(--success-100)', textColor: 'var(--success-700)' },
    cancelled: { label: 'Cancelled', bgColor: 'var(--error-100)', textColor: 'var(--error-700)' },
  }

  const { label, bgColor, textColor } = config[status] || { label: status, bgColor: 'var(--gray-100)', textColor: 'var(--gray-700)' }

  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: bgColor, color: textColor }}>
      {label}
    </span>
  )
}
