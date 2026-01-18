import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SettingsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  type UserWithCompany = {
    id: string
    email: string
    full_name: string | null
    role: string | null
    company: {
      id: string
      name: string
      plan: string | null
    } | null
  }

  const typedUser = userData as UserWithCompany | null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Settings</h1>
        <p className="text-sm text-[var(--gray-600)]">Manage your account and company settings</p>
      </div>

      {/* Profile Settings */}
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="text-sm font-semibold text-[var(--gray-900)]">Profile</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-[var(--gray-700)]">
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                defaultValue={typedUser?.full_name || ''}
                placeholder="Your full name"
                className="border-[var(--gray-300)] rounded"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[var(--gray-700)]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                defaultValue={typedUser?.email || ''}
                disabled
                className="border-[var(--gray-300)] rounded bg-[var(--gray-50)]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Company Settings */}
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="text-sm font-semibold text-[var(--gray-900)]">Company</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName" className="text-sm font-medium text-[var(--gray-700)]">
                Company Name
              </Label>
              <Input
                id="companyName"
                type="text"
                defaultValue={typedUser?.company?.name || ''}
                placeholder="Company name"
                className="border-[var(--gray-300)] rounded"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[var(--gray-700)]">
                Plan
              </Label>
              <div className="flex items-center h-10 px-3 border border-[var(--gray-300)] rounded bg-[var(--gray-50)]">
                <span className="text-sm text-[var(--gray-700)] capitalize">{typedUser?.company?.plan || 'Free'}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
              Update Company
            </Button>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="text-sm font-semibold text-[var(--gray-900)]">Security</h2>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium text-[var(--gray-700)]">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Enter current password"
              className="border-[var(--gray-300)] rounded max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium text-[var(--gray-700)]">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              className="border-[var(--gray-300)] rounded max-w-md"
            />
          </div>
          <div className="flex justify-end">
            <Button variant="outline" className="border-[var(--gray-300)] text-[var(--gray-700)] rounded">
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
