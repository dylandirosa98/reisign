import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function check() {
  // Get auth users
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  console.log('Auth users:')
  authUsers?.users.forEach(u => console.log('  Auth ID:', u.id, '| Email:', u.email))

  // Get public users
  const { data: publicUsers } = await supabase.from('users').select('id, email, company_id')
  console.log('\nPublic users table:')
  publicUsers?.forEach(u => console.log('  User ID:', u.id, '| Email:', u.email, '| Company:', u.company_id))

  // Check if IDs match
  console.log('\nID Match Check:')
  authUsers?.users.forEach(authUser => {
    const publicUser = publicUsers?.find(p => p.email === authUser.email)
    const matches = publicUser?.id === authUser.id
    console.log(`  ${authUser.email}: Auth=${authUser.id} | Public=${publicUser?.id} | Match=${matches}`)
  })
}

check()
