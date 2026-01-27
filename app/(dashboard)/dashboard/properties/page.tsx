import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Plus, Building2, ChevronRight } from 'lucide-react'
import { ContractCountBadge } from './contract-count-badge'
import { PropertyStatusSelect } from './property-status-select'

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

  // Fetch properties with their contracts
  const { data: properties } = await adminSupabase
    .from('properties')
    .select(`
      id,
      address,
      city,
      state,
      zip,
      status,
      created_at,
      contracts (
        id,
        status,
        template_id,
        custom_fields
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  // Fetch all company templates to map IDs to names
  const { data: companyTemplates } = await adminSupabase
    .from('company_templates' as any)
    .select('id, name')
    .eq('company_id', companyId)

  // Fetch global templates
  const { data: globalTemplates } = await adminSupabase
    .from('templates')
    .select('id, name')

  const templateMap = new Map<string, string>()
  if (companyTemplates) {
    (companyTemplates as unknown as Array<{ id: string; name: string }>).forEach(t => {
      templateMap.set(t.id, t.name)
    })
  }
  if (globalTemplates) {
    globalTemplates.forEach(t => {
      templateMap.set(t.id, t.name)
    })
  }

  type Contract = {
    id: string
    status: string | null
    template_id: string | null
    custom_fields: {
      company_template_id?: string
    } | null
  }

  type Property = {
    id: string
    address: string
    city: string | null
    state: string | null
    zip: string | null
    status: string | null
    created_at: string | null
    contracts: Contract[]
  }

  const typedProperties = properties as Property[] | null

  // Process properties to include contract info with template names
  const propertiesWithContracts = typedProperties?.map(property => {
    const contracts = property.contracts || []
    const contractsWithTemplates = contracts.map(contract => {
      // Check company template first, then global template
      const companyTemplateId = contract.custom_fields?.company_template_id
      const globalTemplateId = contract.template_id

      let templateName: string | null = null
      if (companyTemplateId) {
        templateName = templateMap.get(companyTemplateId) || null
      }
      if (!templateName && globalTemplateId) {
        templateName = templateMap.get(globalTemplateId) || null
      }

      return {
        id: contract.id,
        status: contract.status,
        templateName: templateName || 'General Purchase Agreement',
      }
    })

    return {
      ...property,
      status: (property.status || 'none') as 'none' | 'in_escrow' | 'terminated' | 'pending' | 'closed',
      totalContracts: contracts.length,
      contractsWithTemplates,
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
        {propertiesWithContracts && propertiesWithContracts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">City</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">State</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">ZIP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Documents</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-200)]">
              {propertiesWithContracts.map((property) => (
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
                    <PropertyStatusSelect
                      propertyId={property.id}
                      currentStatus={property.status}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ContractCountBadge
                      total={property.totalContracts}
                      contracts={property.contractsWithTemplates}
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
