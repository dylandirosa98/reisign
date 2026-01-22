import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS, type PlanTier } from '@/lib/plans'

interface MonthlyStats {
  month: string
  contracts_sent: number
  contracts_completed: number
  new_users: number
  new_companies: number
  ai_generations: number
  revenue: number
}

interface ContractsByStatus {
  draft: number
  sent: number
  viewed: number
  completed: number
  cancelled: number
}

interface PlanDistribution {
  plan: string
  count: number
  percentage: number
}

interface TopCompany {
  id: string
  name: string
  contracts_sent: number
  plan: string
}

export async function GET() {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is system admin
    const { data: userData } = await adminSupabase
      .from('users')
      .select('is_system_admin, role')
      .eq('id', user.id)
      .single()

    if (!userData?.is_system_admin && userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get date ranges
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // === OVERVIEW STATS ===

    // Total companies
    const { count: totalCompanies } = await adminSupabase
      .from('companies')
      .select('id', { count: 'exact', head: true })

    // Total users
    const { count: totalUsers } = await adminSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    // Total contracts
    const { count: totalContracts } = await adminSupabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })

    // Contracts sent (not drafts)
    const { count: totalContractsSent } = await adminSupabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .not('sent_at', 'is', null)

    // New signups this week
    const { count: signupsThisWeek } = await adminSupabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfWeek.toISOString())

    // Contracts sent this week
    const { count: contractsThisWeek } = await adminSupabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .not('sent_at', 'is', null)
      .gte('sent_at', startOfWeek.toISOString())

    // Contracts sent this month
    const { count: contractsThisMonth } = await adminSupabase
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .not('sent_at', 'is', null)
      .gte('sent_at', startOfMonth.toISOString())

    // === CONTRACT STATUS BREAKDOWN ===
    const { data: contractStatusData } = await adminSupabase
      .from('contracts')
      .select('status')

    const contractsByStatus: ContractsByStatus = {
      draft: 0,
      sent: 0,
      viewed: 0,
      completed: 0,
      cancelled: 0,
    }

    contractStatusData?.forEach((c) => {
      const status = c.status as keyof ContractsByStatus
      if (status in contractsByStatus) {
        contractsByStatus[status]++
      }
    })

    // === SIGNATURE FUNNEL ===
    const signatureFunnel = {
      sent: contractsByStatus.sent + contractsByStatus.viewed + contractsByStatus.completed,
      viewed: contractsByStatus.viewed + contractsByStatus.completed,
      completed: contractsByStatus.completed,
      completionRate: 0,
    }
    if (signatureFunnel.sent > 0) {
      signatureFunnel.completionRate = Math.round((signatureFunnel.completed / signatureFunnel.sent) * 100)
    }

    // === PLAN DISTRIBUTION ===
    const { data: companiesWithPlans } = await adminSupabase
      .from('companies')
      .select('actual_plan')

    const planCounts: Record<string, number> = {}
    companiesWithPlans?.forEach((c) => {
      const plan = c.actual_plan || 'free'
      planCounts[plan] = (planCounts[plan] || 0) + 1
    })

    const totalCompanyCount = companiesWithPlans?.length || 1
    const planDistribution: PlanDistribution[] = Object.entries(planCounts).map(([plan, count]) => ({
      plan: PLANS[plan as PlanTier]?.name || plan,
      count,
      percentage: Math.round((count / totalCompanyCount) * 100),
    }))

    // === AI USAGE STATS ===
    const { count: aiGenerationsToday } = await adminSupabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', 'ai_generation')
      .gte('created_at', startOfToday.toISOString())

    const { count: aiGenerationsThisWeek } = await adminSupabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', 'ai_generation')
      .gte('created_at', startOfWeek.toISOString())

    const { count: aiGenerationsThisMonth } = await adminSupabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', 'ai_generation')
      .gte('created_at', startOfMonth.toISOString())

    const { count: totalAiGenerations } = await adminSupabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('action_type', 'ai_generation')

    // Estimate AI cost (approx $0.01 per generation for GPT-4)
    const estimatedAiCostThisMonth = (aiGenerationsThisMonth || 0) * 0.01

    // === MONTHLY TRENDS (Last 6 months) ===
    const monthlyStats: MonthlyStats[] = []

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

      // Contracts sent in this month (based on sent_at for billing)
      const { count: contractsSent } = await adminSupabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .not('sent_at', 'is', null)
        .gte('sent_at', monthStart.toISOString())
        .lte('sent_at', monthEnd.toISOString())

      // Contracts completed in this month
      const { count: contractsCompleted } = await adminSupabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null)
        .gte('completed_at', monthStart.toISOString())
        .lte('completed_at', monthEnd.toISOString())

      // New users this month
      const { count: newUsers } = await adminSupabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      // New companies this month
      const { count: newCompanies } = await adminSupabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      // AI generations this month
      const { count: aiGens } = await adminSupabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('action_type', 'ai_generation')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString())

      // Calculate estimated revenue (simplified - sum of plan prices)
      // In production, this would come from Stripe
      let estimatedRevenue = 0
      const { data: activeCompanies } = await adminSupabase
        .from('companies')
        .select('billing_plan')
        .gte('created_at', monthStart.toISOString())
        .neq('billing_plan', 'free')

      activeCompanies?.forEach((c) => {
        const plan = c.billing_plan as PlanTier
        if (PLANS[plan]) {
          estimatedRevenue += PLANS[plan].monthlyPrice
        }
      })

      monthlyStats.push({
        month: monthLabel,
        contracts_sent: contractsSent || 0,
        contracts_completed: contractsCompleted || 0,
        new_users: newUsers || 0,
        new_companies: newCompanies || 0,
        ai_generations: aiGens || 0,
        revenue: estimatedRevenue,
      })
    }

    // === CONTRACTS BY MONTH (for billing tracking) ===
    const contractsByMonth: { month: string; sent: number; company_breakdown: { company_id: string; company_name: string; count: number }[] }[] = []

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      // Get contracts sent with company info
      const { data: contractsWithCompany } = await adminSupabase
        .from('contracts')
        .select('company_id, companies(name)')
        .not('sent_at', 'is', null)
        .gte('sent_at', monthStart.toISOString())
        .lte('sent_at', monthEnd.toISOString())

      // Group by company
      const companyMap: Record<string, { company_id: string; company_name: string; count: number }> = {}
      contractsWithCompany?.forEach((c: any) => {
        const companyId = c.company_id
        const companyName = c.companies?.name || 'Unknown'
        if (!companyMap[companyId]) {
          companyMap[companyId] = { company_id: companyId, company_name: companyName, count: 0 }
        }
        companyMap[companyId].count++
      })

      contractsByMonth.push({
        month: monthLabel,
        sent: contractsWithCompany?.length || 0,
        company_breakdown: Object.values(companyMap).sort((a, b) => b.count - a.count),
      })
    }

    // === TOP COMPANIES BY CONTRACTS SENT ===
    const { data: topCompaniesData } = await adminSupabase
      .from('contracts')
      .select('company_id, companies(name, actual_plan)')
      .not('sent_at', 'is', null)
      .gte('sent_at', thirtyDaysAgo.toISOString())

    const companyContractCounts: Record<string, { name: string; plan: string; count: number }> = {}
    topCompaniesData?.forEach((c: any) => {
      const id = c.company_id
      if (!companyContractCounts[id]) {
        companyContractCounts[id] = {
          name: c.companies?.name || 'Unknown',
          plan: c.companies?.actual_plan || 'free',
          count: 0,
        }
      }
      companyContractCounts[id].count++
    })

    const topCompanies: TopCompany[] = Object.entries(companyContractCounts)
      .map(([id, data]) => ({
        id,
        name: data.name,
        contracts_sent: data.count,
        plan: PLANS[data.plan as PlanTier]?.name || data.plan,
      }))
      .sort((a, b) => b.contracts_sent - a.contracts_sent)
      .slice(0, 10)

    // === MRR CALCULATION ===
    let mrr = 0
    companiesWithPlans?.forEach((c) => {
      const plan = c.actual_plan as PlanTier
      if (plan && plan !== 'free' && PLANS[plan]) {
        mrr += PLANS[plan].monthlyPrice
      }
    })

    return NextResponse.json({
      overview: {
        totalCompanies: totalCompanies || 0,
        totalUsers: totalUsers || 0,
        totalContracts: totalContracts || 0,
        totalContractsSent: totalContractsSent || 0,
        signupsThisWeek: signupsThisWeek || 0,
        contractsThisWeek: contractsThisWeek || 0,
        contractsThisMonth: contractsThisMonth || 0,
        mrr,
      },
      contractsByStatus,
      signatureFunnel,
      planDistribution,
      aiUsage: {
        today: aiGenerationsToday || 0,
        thisWeek: aiGenerationsThisWeek || 0,
        thisMonth: aiGenerationsThisMonth || 0,
        total: totalAiGenerations || 0,
        estimatedCostThisMonth: estimatedAiCostThisMonth,
      },
      monthlyStats,
      contractsByMonth,
      topCompanies,
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
