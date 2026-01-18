import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupAccounts() {
  console.log('Setting up accounts...\n')

  // 1. Create admin account
  console.log('Creating admin account: dylandirosa980@gmail.com')
  const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
    email: 'dylandirosa980@gmail.com',
    password: 'DDHrei123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Dylan DiRosa'
    }
  })

  if (adminAuthError) {
    console.error('Admin auth error:', adminAuthError.message)
  } else {
    console.log('Admin auth user created:', adminAuth.user.id)

    // Create admin company
    const { data: adminCompany, error: adminCompanyError } = await supabase
      .from('companies')
      .insert({
        name: 'REI Sign Admin',
        plan: 'enterprise'
      })
      .select()
      .single()

    if (adminCompanyError) {
      console.error('Admin company error:', adminCompanyError.message)
    } else {
      console.log('Admin company created:', adminCompany.id)

      // Create admin user record
      const { error: adminUserError } = await supabase
        .from('users')
        .insert({
          id: adminAuth.user.id,
          email: 'dylandirosa980@gmail.com',
          full_name: 'Dylan DiRosa',
          company_id: adminCompany.id,
          role: 'admin',
          is_active: true
        })

      if (adminUserError) {
        console.error('Admin user error:', adminUserError.message)
      } else {
        console.log('Admin user record created\n')
      }
    }
  }

  // 2. Create test user account
  console.log('Creating test user account: hey@gmail.com')
  const { data: testAuth, error: testAuthError } = await supabase.auth.admin.createUser({
    email: 'hey@gmail.com',
    password: 'test1234', // Supabase requires min 6 chars, using test1234
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User'
    }
  })

  if (testAuthError) {
    console.error('Test auth error:', testAuthError.message)
  } else {
    console.log('Test auth user created:', testAuth.user.id)

    // Create test user company
    const { data: testCompany, error: testCompanyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Wholesaling LLC',
        plan: 'free'
      })
      .select()
      .single()

    if (testCompanyError) {
      console.error('Test company error:', testCompanyError.message)
    } else {
      console.log('Test company created:', testCompany.id)

      // Create test user record
      const { error: testUserError } = await supabase
        .from('users')
        .insert({
          id: testAuth.user.id,
          email: 'hey@gmail.com',
          full_name: 'Test User',
          company_id: testCompany.id,
          role: 'manager',
          is_active: true
        })

      if (testUserError) {
        console.error('Test user error:', testUserError.message)
      } else {
        console.log('Test user record created\n')
      }
    }
  }

  console.log('='.repeat(50))
  console.log('Account Setup Complete!')
  console.log('='.repeat(50))
  console.log('\nAdmin Account:')
  console.log('  Email: dylandirosa980@gmail.com')
  console.log('  Password: DDHrei123')
  console.log('  Role: admin')
  console.log('\nTest User Account:')
  console.log('  Email: hey@gmail.com')
  console.log('  Password: test1234')
  console.log('  Role: manager (normal user)')
  console.log('\nNote: Password changed to "test1234" - Supabase requires min 6 characters')
}

setupAccounts().catch(console.error)
