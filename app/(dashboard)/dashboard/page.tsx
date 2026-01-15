import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Clock, CheckCircle, Eye } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  // Get user's company_id
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = (userData as { company_id: string | null } | null)?.company_id

  if (!companyId) {
    return <div>No company found</div>
  }

  // Get contract stats
  const { data: contractsData } = await supabase
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

  // Get recent contracts
  const { data: recentContractsData } = await supabase
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
    property: { address: string; city: string | null; state: string | null } | null
  }

  const recentContracts = recentContractsData as RecentContract[] | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/dashboard/contracts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Contract
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Signature</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent + stats.viewed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Contracts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contracts</CardTitle>
          <CardDescription>Your most recent contract activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentContracts && recentContracts.length > 0 ? (
            <div className="space-y-4">
              {recentContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/dashboard/contracts/${contract.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {contract.property?.address || 'No address'}
                      {contract.property?.city && `, ${contract.property.city}`}
                      {contract.property?.state && `, ${contract.property.state}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contract.buyer_name} • ${contract.price.toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={contract.status} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No contracts yet</p>
              <Link href="/dashboard/contracts/new">
                <Button variant="link">Create your first contract</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: 'Draft', variant: 'outline' },
    sent: { label: 'Sent', variant: 'secondary' },
    viewed: { label: 'Viewed', variant: 'default' },
    completed: { label: 'Completed', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'outline' as const }

  return <Badge variant={variant}>{label}</Badge>
}
