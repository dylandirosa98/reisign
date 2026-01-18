import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import { ContractCountBadge } from './contract-count-badge'

export default async function PropertiesPage() {
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

  // Fetch properties with their contract counts by status
  const { data: properties } = await adminSupabase
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
        status
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  type Contract = {
    id: string
    status: string | null
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

  const typedProperties = properties as Property[] | null

  // Calculate contract counts by status for each property
  const propertiesWithCounts = typedProperties?.map(property => {
    const contracts = property.contracts || []
    const statusCounts = {
      draft: 0,
      sent: 0,
      viewed: 0,
      completed: 0,
      cancelled: 0
    }

    contracts.forEach(contract => {
      const status = contract.status || 'draft'
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++
      }
    })

    return {
      ...property,
      totalContracts: contracts.length,
      statusCounts
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Properties</h1>
          <p className="text-sm text-[var(--gray-600)]">Manage your property addresses</p>
        </div>
        <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
          <Plus className="mr-2 h-4 w-4" />
          Add Property
        </Button>
      </div>

      <div className="bg-white border border-[var(--gray-200)] rounded">
        {propertiesWithCounts && propertiesWithCounts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">State</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">ZIP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Contracts</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-200)]">
              {propertiesWithCounts.map((property) => (
                <tr key={property.id} className="hover:bg-[var(--gray-50)] group">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="font-medium text-[var(--gray-900)] hover:text-[var(--primary-700)]"
                    >
                      {property.address}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{property.city || '-'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{property.state || '-'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{property.zip || '-'}</td>
                  <td className="px-4 py-3">
                    <ContractCountBadge
                      total={property.totalContracts}
                      statusCounts={property.statusCounts}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/properties/${property.id}`}
                      className="text-[var(--gray-400)] group-hover:text-[var(--primary-700)]"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No properties yet</h3>
            <p className="text-sm text-[var(--gray-600)] mb-4">Add your first property to get started</p>
            <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
              Add Property
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
