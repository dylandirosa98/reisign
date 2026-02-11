import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // Check if user exists in auth.users
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })

    if (error) {
      console.error('Error checking email:', error)
      return NextResponse.json({ exists: false })
    }

    const exists = data.users.some(
      user => user.email?.toLowerCase() === email.toLowerCase()
    )

    return NextResponse.json({ exists })
  } catch (error) {
    console.error('Check email error:', error)
    return NextResponse.json({ exists: false })
  }
}
