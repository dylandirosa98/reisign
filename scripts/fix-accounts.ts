import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixAccounts() {
  console.log('Fixing user records...\n')

  // Get companies
  const { data: companies } = await supabase
    .from('companies')
    .select('*')

  console.log('Companies:', companies)

  // Find the admin and test companies
  const adminCompany = companies?.find(c => c.name === 'REI Sign Admin')
  const testCompany = companies?.find(c => c.name === 'Test Wholesaling LLC')

  if (!adminCompany || !testCompany) {
    console.error('Companies not found!')
    return
  }

  // Update admin user
  const { error: adminError } = await supabase
    .from('users')
    .update({
      company_id: adminCompany.id,
      role: 'admin',
      full_name: 'Dylan DiRosa',
      is_active: true
    })
    .eq('email', 'dylandirosa980@gmail.com')

  if (adminError) {
    console.error('Admin update error:', adminError.message)
  } else {
    console.log('Admin user updated successfully')
  }

  // Update test user
  const { error: testError } = await supabase
    .from('users')
    .update({
      company_id: testCompany.id,
      role: 'manager',
      full_name: 'Test User',
      is_active: true
    })
    .eq('email', 'hey@gmail.com')

  if (testError) {
    console.error('Test user update error:', testError.message)
  } else {
    console.log('Test user updated successfully')
  }

  // Verify
  const { data: users } = await supabase
    .from('users')
    .select('*, company:companies(name)')

  console.log('\nFinal users:')
  users?.forEach(u => {
    console.log(`- ${u.email}: role=${u.role}, company=${u.company?.name}`)
  })

  console.log('\n='.repeat(50))
  console.log('Accounts Ready!')
  console.log('='.repeat(50))
  console.log('\nAdmin Account:')
  console.log('  Email: dylandirosa980@gmail.com')
  console.log('  Password: DDHrei123')
  console.log('  Role: admin')
  console.log('\nTest User Account:')
  console.log('  Email: hey@gmail.com')
  console.log('  Password: test1234')
  console.log('  Role: manager (normal user)')
}

fixAccounts().catch(console.error)
