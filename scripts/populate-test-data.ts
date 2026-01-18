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

async function populateTestData() {
  console.log('Populating test data...\n')

  // Get the test user and their company
  const { data: testUser } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('email', 'hey@gmail.com')
    .single()

  if (!testUser) {
    console.error('Test user not found!')
    return
  }

  console.log('Test user:', testUser.email)
  console.log('Company ID:', testUser.company_id)
  console.log('Company:', testUser.company?.name)

  const companyId = testUser.company_id

  if (!companyId) {
    console.error('Test user has no company_id!')
    return
  }

  // Create some test properties
  console.log('\nCreating test properties...')
  const properties = [
    { address: '123 Main Street', city: 'Miami', state: 'FL', zip: '33101', company_id: companyId },
    { address: '456 Oak Avenue', city: 'Orlando', state: 'FL', zip: '32801', company_id: companyId },
    { address: '789 Palm Drive', city: 'Tampa', state: 'FL', zip: '33601', company_id: companyId },
  ]

  const { data: createdProperties, error: propError } = await supabase
    .from('properties')
    .insert(properties)
    .select()

  if (propError) {
    console.error('Property error:', propError.message)
  } else {
    console.log(`Created ${createdProperties.length} properties`)
  }

  // Create some test contracts
  console.log('\nCreating test contracts...')
  const contracts = [
    {
      company_id: companyId,
      created_by: testUser.id,
      property_id: createdProperties?.[0]?.id,
      buyer_name: 'John Smith',
      buyer_email: 'john.smith@example.com',
      seller_name: 'Jane Doe',
      seller_email: 'jane.doe@example.com',
      price: 150000,
      status: 'completed',
      completed_at: new Date().toISOString()
    },
    {
      company_id: companyId,
      created_by: testUser.id,
      property_id: createdProperties?.[1]?.id,
      buyer_name: 'Mike Johnson',
      buyer_email: 'mike.j@example.com',
      seller_name: 'Sarah Williams',
      seller_email: 'sarah.w@example.com',
      price: 225000,
      status: 'sent',
      sent_at: new Date().toISOString()
    },
    {
      company_id: companyId,
      created_by: testUser.id,
      property_id: createdProperties?.[2]?.id,
      buyer_name: 'Emily Brown',
      buyer_email: 'emily.b@example.com',
      seller_name: 'Robert Davis',
      seller_email: 'robert.d@example.com',
      price: 185000,
      status: 'draft'
    },
  ]

  const { data: createdContracts, error: contractError } = await supabase
    .from('contracts')
    .insert(contracts)
    .select()

  if (contractError) {
    console.error('Contract error:', contractError.message)
  } else {
    console.log(`Created ${createdContracts.length} contracts`)
  }

  // Verify the test user data
  console.log('\n' + '='.repeat(50))
  console.log('Test Data Population Complete!')
  console.log('='.repeat(50))

  const { data: finalUser } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('email', 'hey@gmail.com')
    .single()

  console.log('\nTest User Summary:')
  console.log(`  Email: ${finalUser?.email}`)
  console.log(`  Name: ${finalUser?.full_name}`)
  console.log(`  Role: ${finalUser?.role}`)
  console.log(`  Company: ${finalUser?.company?.name}`)
  console.log(`  Company ID: ${finalUser?.company_id}`)

  const { count: propCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  const { count: contractCount } = await supabase
    .from('contracts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)

  console.log(`  Properties: ${propCount}`)
  console.log(`  Contracts: ${contractCount}`)

  console.log('\nThe test user should now skip onboarding and see the dashboard with data.')
}

populateTestData().catch(console.error)
