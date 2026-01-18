import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'

export default async function TeamPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div>Not authenticated</div>
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  const companyId = (userData as { company_id: string | null; role: string } | null)?.company_id
  const userRole = (userData as { company_id: string | null; role: string } | null)?.role
  const isManager = userRole === 'manager' || userRole === 'admin'

  if (!companyId) {
    return <div>No company found</div>
  }

  // Get team members
  const { data: teamMembers } = await adminSupabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: true })

  type TeamMember = {
    id: string
    email: string
    full_name: string | null
    role: string | null
    is_active: boolean | null
    created_at: string | null
  }

  const typedMembers = teamMembers as TeamMember[] | null

  // Get pending invites
  const { data: invites } = await adminSupabase
    .from('invites')
    .select('*')
    .eq('company_id', companyId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  type Invite = {
    id: string
    email: string
    role: string | null
    expires_at: string
    created_at: string | null
  }

  const typedInvites = invites as Invite[] | null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Team</h1>
          <p className="text-sm text-[var(--gray-600)]">Manage your team members</p>
        </div>
        {isManager && (
          <Button className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white font-semibold rounded">
            <Plus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="text-sm font-semibold text-[var(--gray-900)]">Members</h2>
        </div>
        {typedMembers && typedMembers.length > 0 ? (
          <table className="w-full">
            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-200)]">
              {typedMembers.map((member) => (
                <tr key={member.id} className="hover:bg-[var(--gray-100)]">
                  <td className="px-4 py-3 font-medium text-[var(--gray-900)]">
                    {member.full_name || 'No name'}
                    {member.id === user.id && <span className="ml-2 text-xs text-[var(--gray-500)]">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{member.email}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)] capitalize">{member.role || 'user'}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded"
                      style={{
                        backgroundColor: member.is_active ? 'var(--success-100)' : 'var(--gray-100)',
                        color: member.is_active ? 'var(--success-700)' : 'var(--gray-700)',
                      }}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
            <p className="text-sm text-[var(--gray-600)]">No team members found</p>
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {isManager && typedInvites && typedInvites.length > 0 && (
        <div className="bg-white border border-[var(--gray-200)] rounded">
          <div className="px-4 py-3 border-b border-[var(--gray-200)]">
            <h2 className="text-sm font-semibold text-[var(--gray-900)]">Pending Invites</h2>
          </div>
          <table className="w-full">
            <thead className="bg-[var(--gray-50)] border-b border-[var(--gray-200)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--gray-700)] uppercase tracking-wide">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--gray-200)]">
              {typedInvites.map((invite) => (
                <tr key={invite.id} className="hover:bg-[var(--gray-100)]">
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">{invite.email}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)] capitalize">{invite.role || 'user'}</td>
                  <td className="px-4 py-3 text-sm text-[var(--gray-700)]">
                    {new Date(invite.expires_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
