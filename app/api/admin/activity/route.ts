import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ActivityItem {
  id: string
  type: 'signup' | 'contract_sent' | 'contract_completed' | 'plan_changed' | 'ai_generation' | 'webhook'
  description: string
  metadata: Record<string, unknown>
  created_at: string
  user_email?: string
  company_name?: string
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // Optional filter

    const activities: ActivityItem[] = []

    // Get recent signups (new users)
    if (!type || type === 'signup') {
      const { data: recentUsers } = await adminSupabase
        .from('users')
        .select('id, email, full_name, created_at, company_id, companies(name)')
        .order('created_at', { ascending: false })
        .limit(20)

      recentUsers?.forEach((u: any) => {
        activities.push({
          id: `signup-${u.id}`,
          type: 'signup',
          description: `New user signed up: ${u.full_name || u.email}`,
          metadata: { user_id: u.id },
          created_at: u.created_at,
          user_email: u.email,
          company_name: u.companies?.name,
        })
      })
    }

    // Get recent contracts sent
    if (!type || type === 'contract_sent') {
      const { data: recentContractsSent } = await adminSupabase
        .from('contracts')
        .select('id, sent_at, seller_name, buyer_name, price, company_id, companies(name), created_by, users!contracts_created_by_fkey(email)')
        .not('sent_at', 'is', null)
        .order('sent_at', { ascending: false })
        .limit(20)

      recentContractsSent?.forEach((c: any) => {
        activities.push({
          id: `sent-${c.id}`,
          type: 'contract_sent',
          description: `Contract sent: ${c.seller_name} → ${c.buyer_name} ($${Number(c.price).toLocaleString()})`,
          metadata: { contract_id: c.id, price: c.price },
          created_at: c.sent_at,
          user_email: c.users?.email,
          company_name: c.companies?.name,
        })
      })
    }

    // Get recent contracts completed
    if (!type || type === 'contract_completed') {
      const { data: recentContractsCompleted } = await adminSupabase
        .from('contracts')
        .select('id, completed_at, seller_name, buyer_name, price, company_id, companies(name)')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(20)

      recentContractsCompleted?.forEach((c: any) => {
        activities.push({
          id: `completed-${c.id}`,
          type: 'contract_completed',
          description: `Contract completed: ${c.seller_name} → ${c.buyer_name} ($${Number(c.price).toLocaleString()})`,
          metadata: { contract_id: c.id, price: c.price },
          created_at: c.completed_at,
          company_name: c.companies?.name,
        })
      })
    }

    // Get recent AI generations
    if (!type || type === 'ai_generation') {
      const { data: recentAiUsage } = await adminSupabase
        .from('usage_logs')
        .select('id, created_at, user_id, company_id, metadata, users(email), companies(name)')
        .eq('action_type', 'ai_generation')
        .order('created_at', { ascending: false })
        .limit(20)

      recentAiUsage?.forEach((a: any) => {
        const clausesGenerated = a.metadata?.clauses_generated || 'unknown'
        activities.push({
          id: `ai-${a.id}`,
          type: 'ai_generation',
          description: `AI generated ${clausesGenerated} clause(s)`,
          metadata: a.metadata || {},
          created_at: a.created_at,
          user_email: a.users?.email,
          company_name: a.companies?.name,
        })
      })
    }

    // Get recent webhook events (contract status changes)
    if (!type || type === 'webhook') {
      const { data: recentStatusChanges } = await adminSupabase
        .from('contract_status_history')
        .select('id, created_at, status, metadata, contract_id, contracts(seller_name, buyer_name, company_id, companies(name))')
        .order('created_at', { ascending: false })
        .limit(20)

      recentStatusChanges?.forEach((s: any) => {
        if (s.metadata?.action === 'webhook_update') {
          activities.push({
            id: `webhook-${s.id}`,
            type: 'webhook',
            description: `Webhook: Contract ${s.contracts?.seller_name} → ${s.contracts?.buyer_name} changed to ${s.status}`,
            metadata: s.metadata || {},
            created_at: s.created_at,
            company_name: s.contracts?.companies?.name,
          })
        }
      })
    }

    // Sort all activities by date (most recent first)
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Apply pagination
    const paginatedActivities = activities.slice(offset, offset + limit)

    return NextResponse.json({
      activities: paginatedActivities,
      total: activities.length,
      hasMore: offset + limit < activities.length,
    })
  } catch (error) {
    console.error('Admin activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
