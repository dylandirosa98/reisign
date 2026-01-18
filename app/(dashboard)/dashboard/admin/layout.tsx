import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client to check user role
  const adminSupabase = createAdminClient()

  const { data: userData } = await adminSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only allow admin users
  if (userData?.role !== 'admin') {
    redirect('/dashboard')
  }

  return <>{children}</>
}
