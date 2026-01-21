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
  Eye,
  EyeOff,
  AlertCircle,
  FileText
} from 'lucide-react'

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

export default function TeamPage() {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    monthly_contract_limit: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchTeam()
  }, [])

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

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError(null)

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: addForm.email,
          password: addForm.password,
          full_name: addForm.full_name || null,
          role: addForm.role,
          monthly_contract_limit: addForm.monthly_contract_limit ? parseInt(addForm.monthly_contract_limit) : null,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setAddError(result.error || 'Failed to add member')
        return
      }

      // Success - refresh and close modal
      await fetchTeam()
      setShowAddModal(false)
      setAddForm({ email: '', password: '', full_name: '', role: 'user', monthly_contract_limit: '' })
    } catch (err) {
      console.error('Add member error:', err)
      setAddError('Failed to add member')
    } finally {
      setAddLoading(false)
    }
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setAddError(null)
                  setAddForm({ email: '', password: '', full_name: '', role: 'user', monthly_contract_limit: '' })
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="member@company.com"
                  autoComplete="off"
                  name="new-member-email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    name="new-member-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.monthly_contract_limit}
                    onChange={(e) => setAddForm({ ...addForm, monthly_contract_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="No limit"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                The member will use this email and password to log in. You can set a monthly contract limit to restrict how many contracts they can send.
              </p>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false)
                    setAddError(null)
                    setAddForm({ email: '', password: '', full_name: '', role: 'user', monthly_contract_limit: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {addLoading ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </form>
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
