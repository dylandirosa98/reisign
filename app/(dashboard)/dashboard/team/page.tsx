'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Users,
  Edit2,
  Trash2,
  X,
  Save,
  AlertCircle,
  AlertTriangle,
  FileText,
  Mail,
  Clock,
  CheckCircle,
  Copy,
  Loader2,
} from 'lucide-react'
import { PLANS, type PlanTier } from '@/lib/plans'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string | null
  is_active: boolean | null
  monthly_contract_limit: number | null
  contracts_sent_this_period: number | null
  created_at: string | null
}

interface TeamData {
  members: TeamMember[]
  currentUserRole: string
  companyPlan: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add member modal (invite flow)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    email: '',
    role: 'user',
  })
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; url?: string } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Pending invites
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(false)

  // Edit member
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'user',
    monthly_contract_limit: '',
    is_active: true,
  })
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirmation
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Plan/seat limits
  const [planInfo, setPlanInfo] = useState<{
    maxUsers: number
    currentUsers: number
    extraSeatPrice: number
    planName: string
    isOverage: boolean
  } | null>(null)

  useEffect(() => {
    fetchTeam()
    fetchPlanInfo()
    fetchPendingInvites()
  }, [])

  async function fetchPendingInvites() {
    setLoadingInvites(true)
    try {
      const response = await fetch('/api/team/invite')
      if (response.ok) {
        const data = await response.json()
        setPendingInvites(data.invites || [])
      }
    } catch (err) {
      console.error('Error fetching invites:', err)
    } finally {
      setLoadingInvites(false)
    }
  }

  async function fetchTeam() {
    try {
      setLoading(true)
      const response = await fetch('/api/team')
      if (!response.ok) {
        throw new Error('Failed to fetch team')
      }
      const teamData = await response.json()
      setData(teamData)
    } catch (err) {
      console.error('Error fetching team:', err)
      setError('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlanInfo() {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        // Get plan limits from the company's actual plan
        const actualPlan = (data.company?.actual_plan || 'free') as PlanTier
        const plan = PLANS[actualPlan]
        const maxUsers = plan.limits.maxUsers
        const currentUsers = data.userCount || 1
        const extraSeatPrice = plan.limits.overagePricing.extraSeatPrice
        setPlanInfo({
          maxUsers,
          currentUsers,
          extraSeatPrice,
          planName: plan.name,
          isOverage: currentUsers >= maxUsers,
        })
      }
    } catch (err) {
      console.error('Error fetching plan info:', err)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)
    setInviteSuccess(null)

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email,
          role: addForm.role,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setAddError(result.error || 'Failed to send invite')
        return
      }

      // Success - show invite sent message
      setInviteSuccess({
        email: addForm.email,
        url: result.emailSent ? undefined : result.inviteUrl,
      })

      // Refresh invites list
      await fetchPendingInvites()
      await fetchPlanInfo()

      // Reset form
      setAddForm({ email: '', role: 'user' })
    } catch (err) {
      console.error('Add member error:', err)
      setAddError('Failed to send invite')
    } finally {
      setAddLoading(false)
    }
  }

  function copyInviteUrl(url: string) {
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  async function handleUpdateMember(memberId: string) {
    setEditLoading(true)

    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name || null,
          role: editForm.role,
          monthly_contract_limit: editForm.monthly_contract_limit ? parseInt(editForm.monthly_contract_limit) : null,
          is_active: editForm.is_active,
        }),
      })

      if (!response.ok) {
        const result = await response.json()
        alert(result.error || 'Failed to update member')
        return
      }

      await fetchTeam()
      setEditingMember(null)
    } catch (err) {
      console.error('Update member error:', err)
      alert('Failed to update member')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeleteMember() {
    if (!deletingMember) return
    setDeleteLoading(true)

    try {
      const response = await fetch(`/api/team/${deletingMember.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        alert(result.error || 'Failed to remove member')
        return
      }

      await fetchTeam()
      await fetchPlanInfo() // Refresh plan info after removing member
      setDeletingMember(null)
    } catch (err) {
      console.error('Delete member error:', err)
      alert('Failed to remove member')
    } finally {
      setDeleteLoading(false)
    }
  }

  function startEditing(member: TeamMember) {
    setEditingMember(member.id)
    setEditForm({
      full_name: member.full_name || '',
      role: member.role || 'user',
      monthly_contract_limit: member.monthly_contract_limit?.toString() || '',
      is_active: member.is_active !== false,
    })
  }

  const isManager = data?.currentUserRole === 'manager' || data?.currentUserRole === 'admin'

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="bg-white border border-gray-200 rounded animate-pulse">
          <div className="h-64 bg-gray-100"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-sm text-gray-600">Manage your team members</p>
        </div>
        {isManager && (
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {/* Team Members Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">
            Members ({data?.members.length || 0})
          </h2>
        </div>
        {data?.members && data.members.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Contract Limit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">Status</th>
                {isManager && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wide">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  {editingMember === member.id ? (
                    // Edit mode
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Full name"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{member.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.monthly_contract_limit}
                          onChange={(e) => setEditForm({ ...editForm, monthly_contract_limit: e.target.value })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="No limit"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={editForm.is_active ? 'active' : 'inactive'}
                          onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateMember(member.id)}
                            disabled={editLoading}
                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingMember(null)}
                            className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // View mode
                    <>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {member.full_name || 'No name'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{member.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          member.role === 'manager'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {member.role === 'manager' ? 'Manager' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {member.monthly_contract_limit !== null ? (
                          <div className="flex items-center gap-1 text-sm">
                            <FileText className="w-3.5 h-3.5 text-gray-400" />
                            <span className={member.contracts_sent_this_period !== null && member.contracts_sent_this_period >= member.monthly_contract_limit ? 'text-red-600 font-medium' : 'text-gray-700'}>
                              {member.contracts_sent_this_period || 0}/{member.monthly_contract_limit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No limit</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            member.is_active !== false
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {member.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isManager && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEditing(member)}
                              className="p-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                              title="Edit member"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingMember(member)}
                              className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600">No team members found</p>
          </div>
        )}
      </div>

      {/* Pending Invites Section */}
      {isManager && pendingInvites.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-amber-50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-amber-800">
                Pending Invitations ({pendingInvites.length})
              </h2>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Mail className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invite.email}</p>
                    <p className="text-xs text-gray-500">
                      Invited {new Date(invite.created_at).toLocaleDateString()} · Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  invite.role === 'manager'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {invite.role === 'manager' ? 'Manager' : 'User'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal (Invite Flow) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddError(null)
                  setInviteSuccess(null)
                  setAddForm({ email: '', role: 'user' })
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteSuccess ? (
              // Success state
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900">Invitation Sent!</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    We&apos;ve sent an invite to <strong>{inviteSuccess.email}</strong>
                  </p>
                </div>

                {inviteSuccess.url && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-800 mb-2">
                      <strong>Note:</strong> Email delivery failed. Share this link manually:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteSuccess.url}
                        className="flex-1 px-3 py-2 text-sm bg-white border border-amber-300 rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyInviteUrl(inviteSuccess.url!)}
                        className="shrink-0"
                      >
                        {copiedUrl ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-500 text-center">
                  They&apos;ll receive an email with instructions to create their account and join your team.
                </p>

                <div className="flex justify-center gap-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInviteSuccess(null)
                    }}
                  >
                    Invite Another
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAddModal(false)
                      setInviteSuccess(null)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              // Form state
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                {addError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {addError}
                  </div>
                )}

                {/* Overage Warning */}
                {planInfo?.isOverage && planInfo.extraSeatPrice > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Extra Seat Charge</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                          Your {planInfo.planName} plan includes {planInfo.maxUsers} user{planInfo.maxUsers !== 1 ? 's' : ''}.
                          Adding this member will add{' '}
                          <span className="font-semibold">${(planInfo.extraSeatPrice / 100).toFixed(2)}/month</span> to your subscription when they accept.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Plan limit reached - cannot add (free/individual) */}
                {planInfo?.isOverage && planInfo.extraSeatPrice === 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Team Limit Reached</p>
                        <p className="text-sm text-red-700 mt-0.5">
                          Your {planInfo.planName} plan only supports {planInfo.maxUsers} user{planInfo.maxUsers !== 1 ? 's' : ''}.
                          Please upgrade your plan to add more team members.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="colleague@company.com"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">User - Can create and send contracts</option>
                    <option value="manager">Manager - Full access including team & billing</option>
                  </select>
                </div>

                <p className="text-xs text-gray-500">
                  An invitation email will be sent. The recipient will create their own password when they sign up.
                </p>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false)
                      setAddError(null)
                      setAddForm({ email: '', role: 'user' })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addLoading || (planInfo?.isOverage && planInfo.extraSeatPrice === 0)}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invite
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Team Member</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove <strong>{deletingMember.full_name || deletingMember.email}</strong> from your team? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setDeletingMember(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteMember}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLoading ? 'Removing...' : 'Remove Member'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
