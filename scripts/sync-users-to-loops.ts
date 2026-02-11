/**
 * Script to sync existing users to Loops mailing list
 * Run with: npx ts-node scripts/sync-users-to-loops.ts
 */

import 'dotenv/config'

const LOOPS_API_KEY = process.env.LOOPS_API_KEY
const LOOPS_MAILING_LIST_ID = process.env.LOOPS_MAILING_LIST_ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!LOOPS_API_KEY || !LOOPS_MAILING_LIST_ID) {
  console.error('Missing LOOPS_API_KEY or LOOPS_MAILING_LIST_ID')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function addToLoops(contact: {
  email: string
  firstName?: string
  lastName?: string
  companyName?: string
  plan?: string
  signupDate?: string
  userId?: string
  companyId?: string
}) {
  const response = await fetch('https://app.loops.so/api/v1/contacts/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOOPS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      companyName: contact.companyName,
      plan: contact.plan,
      signupDate: contact.signupDate,
      userId: contact.userId,
      companyId: contact.companyId,
      source: 'migration',
      mailingLists: {
        [LOOPS_MAILING_LIST_ID!]: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Loops API error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function main() {
  console.log('Fetching company managers from Supabase...')

  // Get all managers with their company info
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      full_name,
      role,
      created_at,
      company:companies (
        id,
        name,
        actual_plan,
        created_at
      )
    `)
    .eq('role', 'manager')

  if (error) {
    console.error('Failed to fetch users:', error)
    process.exit(1)
  }

  console.log(`Found ${users?.length || 0} managers to sync`)

  let success = 0
  let failed = 0

  for (const user of users || []) {
    if (!user.email) {
      console.log(`Skipping user ${user.id} - no email`)
      continue
    }

    const company = user.company as any
    const nameParts = (user.full_name || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    try {
      await addToLoops({
        email: user.email,
        firstName,
        lastName,
        companyName: company?.name || '',
        plan: company?.actual_plan || 'free',
        signupDate: company?.created_at || user.created_at,
        userId: user.id,
        companyId: company?.id || '',
      })

      console.log(`✓ Added: ${user.email} (${company?.name || 'No company'})`)
      success++

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.error(`✗ Failed: ${user.email} -`, err)
      failed++
    }
  }

  console.log(`\nSync complete: ${success} added, ${failed} failed`)
}

main()
