'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  X,
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

export interface AIClause {
  id: string
  title: string
  content: string
  status: 'pending' | 'approved' | 'rejected' | 'edited'
  editedContent?: string
}

interface ClauseReviewModalProps {
  isOpen: boolean
  clauses: AIClause[]
  onClose: () => void
  onApproveAll: (approvedClauses: AIClause[]) => void
}

export function ClauseReviewModal({
  isOpen,
  clauses: initialClauses,
  onClose,
  onApproveAll,
}: ClauseReviewModalProps) {
  const [clauses, setClauses] = useState<AIClause[]>(initialClauses)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(initialClauses.map(c => c.id)))

  // Sync state when initialClauses changes (e.g., when new AI clauses are generated)
  useEffect(() => {
    setClauses(initialClauses)
    setExpandedIds(new Set(initialClauses.map(c => c.id)))
  }, [initialClauses])

  if (!isOpen) return null

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleApprove = (id: string) => {
    setClauses(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'approved' as const } : c
    ))
  }

  const handleReject = (id: string) => {
    setClauses(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'rejected' as const } : c
    ))
  }

  const startEditing = (clause: AIClause) => {
    setEditingId(clause.id)
    setEditContent(clause.editedContent || clause.content)
  }

  const saveEdit = (id: string) => {
    setClauses(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'edited' as const, editedContent: editContent } : c
    ))
    setEditingId(null)
    setEditContent('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const pendingCount = clauses.filter(c => c.status === 'pending').length
  const approvedCount = clauses.filter(c => c.status === 'approved' || c.status === 'edited').length
  const allReviewed = pendingCount === 0

  const handleConfirm = () => {
    const approvedClauses = clauses.filter(c => c.status === 'approved' || c.status === 'edited')
    onApproveAll(approvedClauses)
  }

  const handleCancel = () => {
    onClose()
  }

  const getStatusColor = (status: AIClause['status']) => {
    switch (status) {
      case 'approved':
        return 'bg-[var(--success-100)] border-[var(--success-700)] text-[var(--success-700)]'
      case 'rejected':
        return 'bg-[var(--error-100)] border-[var(--error-700)] text-[var(--error-700)]'
      case 'edited':
        return 'bg-[var(--info-100)] border-[var(--info-700)] text-[var(--info-700)]'
      default:
        return 'bg-[var(--warning-100)] border-[var(--warning-700)] text-[var(--warning-700)]'
    }
  }

  const getStatusLabel = (status: AIClause['status']) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      case 'edited': return 'Edited'
      default: return 'Pending Review'
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--gray-200)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary-100)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[var(--primary-700)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--gray-900)]">Review AI-Generated Clauses</h2>
              <p className="text-sm text-[var(--gray-600)]">
                {approvedCount} approved, {pendingCount} pending review
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-[var(--gray-100)] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[var(--gray-500)]" />
          </button>
        </div>

        {/* Warning */}
        <div className="px-6 py-3 bg-[var(--warning-100)] border-b border-[var(--warning-200)]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--warning-700)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[var(--warning-700)]">
              <strong>Disclaimer:</strong> These AI-generated clauses are suggestions only and do not constitute legal advice.
              Please have all clauses reviewed by a licensed attorney before including them in your contracts.
            </p>
          </div>
        </div>

        {/* Clauses List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {clauses.map((clause, index) => (
            <div
              key={clause.id}
              className={`border rounded-lg overflow-hidden ${
                clause.status === 'rejected' ? 'opacity-50' : ''
              }`}
            >
              {/* Clause Header */}
              <div
                className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[var(--gray-50)] ${
                  expandedIds.has(clause.id) ? 'border-b border-[var(--gray-200)]' : ''
                }`}
                onClick={() => toggleExpand(clause.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[var(--gray-500)]">
                    #{index + 1}
                  </span>
                  <span className="font-medium text-[var(--gray-900)]">
                    {clause.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(clause.status)}`}>
                    {getStatusLabel(clause.status)}
                  </span>
                </div>
                {expandedIds.has(clause.id) ? (
                  <ChevronUp className="w-5 h-5 text-[var(--gray-400)]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[var(--gray-400)]" />
                )}
              </div>

              {/* Clause Content */}
              {expandedIds.has(clause.id) && (
                <div className="p-4 bg-[var(--gray-50)]">
                  {editingId === clause.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(clause.id)}
                          className="bg-[var(--primary-700)] text-white"
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-[var(--gray-700)] whitespace-pre-wrap">
                        {clause.editedContent || clause.content}
                      </p>

                      {clause.status !== 'rejected' && (
                        <div className="flex gap-2 pt-2">
                          {clause.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleApprove(clause.id)
                              }}
                              className="bg-[var(--success-600)] hover:bg-[var(--success-700)] text-white"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditing(clause)
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReject(clause.id)
                            }}
                            className="border-[var(--error-700)] text-[var(--error-700)] hover:bg-[var(--error-100)]"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}

                      {clause.status === 'rejected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            setClauses(prev => prev.map(c =>
                              c.id === clause.id ? { ...c, status: 'pending' as const } : c
                            ))
                          }}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--gray-200)] bg-[var(--gray-50)]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--gray-600)]">
              {!allReviewed && (
                <span className="text-[var(--warning-700)]">
                  Review all clauses before continuing
                </span>
              )}
              {allReviewed && approvedCount === 0 && (
                <span>No clauses will be added</span>
              )}
              {allReviewed && approvedCount > 0 && (
                <span className="text-[var(--success-700)]">
                  {approvedCount} clause{approvedCount > 1 ? 's' : ''} will be added to your contract
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
              >
                Cancel All
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!allReviewed}
                className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
              >
                {approvedCount > 0 ? `Add ${approvedCount} Clause${approvedCount > 1 ? 's' : ''}` : 'Continue Without Clauses'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
