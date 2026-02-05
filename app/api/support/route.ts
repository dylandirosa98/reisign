import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAdminNotification } from '@/lib/services/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id, full_name, email, company:companies(name)')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  const body = await request.json()
  const { subject, message, category } = body

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  try {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        company_id: userData.company_id,
        subject,
        message,
        category: category || 'general',
      })
      .select()
      .single()

    if (error) {
      console.error('[Support] Failed to create ticket:', error)
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
    }

    const companyData = userData.company as { name: string } | null

    await sendAdminNotification({
      subject: `Support Ticket: ${subject}`,
      event: 'New Support Ticket',
      details: {
        'Subject': subject,
        'Category': category || 'general',
        'Message': message,
        'User': userData.full_name || userData.email || user.email || 'Unknown',
        'Email': userData.email || user.email || 'Unknown',
        'Company': companyData?.name || 'Unknown',
      },
    })

    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error('[Support] Error creating ticket:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Support] Failed to fetch tickets:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }

  return NextResponse.json({ tickets })
}
