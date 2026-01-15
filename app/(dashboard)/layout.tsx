import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
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

  // Get user with company info
  const { data: userDataRaw } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  const userData = userDataRaw as UserWithCompany | null

  if (!userData?.company_id) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar user={userData} />
      <div className="flex-1 flex flex-col">
        <Header user={userData} />
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
