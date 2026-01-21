import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addAdminEnum() {
  console.log('Adding admin enum value...')

  // The enum needs to be altered via raw SQL
  // Since we can't do that easily via Supabase JS, let's check if the column is TEXT instead

  // First check what type actual_plan is
  const { data: companies, error: fetchError } = await supabase
    .from('companies')
    .select('id, actual_plan')
    .limit(1)

  console.log('Sample company:', companies)

  if (fetchError) {
    console.error('Fetch error:', fetchError)
    return
  }

  // Get the admin user's company
  const { data: adminUser, error: userError } = await supabase
    .from('users')
    .select('company_id')
    .eq('is_system_admin', true)
    .single()

  if (userError || !adminUser) {
    console.error('Could not find admin user:', userError)
    return
  }

  console.log('Admin company ID:', adminUser.company_id)

  // Try to update
  const { error: updateError } = await supabase
    .from('companies')
    .update({ actual_plan: 'admin' })
    .eq('id', adminUser.company_id)

  if (updateError) {
    console.error('Update error:', updateError)
    console.log('\nThe plan_tier enum needs "admin" added. Run this SQL in Supabase dashboard:')
    console.log("ALTER TYPE plan_tier ADD VALUE 'admin';")
  } else {
    console.log('Successfully updated admin company to admin plan!')
  }
}

addAdminEnum()
