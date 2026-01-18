import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TopNav } from '@/components/layout/top-nav'
import type { User, Company } from '@/types/database'

type UserWithCompany = User & { company: Company | null }

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client to bypass RLS for this critical query
  const adminSupabase = createAdminClient()

  // Get user with company info
  const { data: userDataRaw } = await adminSupabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  const userData = userDataRaw as UserWithCompany | null

  if (!userData?.company_id) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--gray-50)]">
      <TopNav user={userData} />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
