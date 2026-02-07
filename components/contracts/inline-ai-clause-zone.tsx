'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, Pencil, X, AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AIClause } from './clause-review-modal'

export type { AIClause }

interface ContractDetails {
  property_address?: string
  property_city?: string
  property_state?: string
  property_zip?: string
  price?: string
  seller_name?: string
  close_of_escrow?: string
  inspection_period?: string
}

interface InlineAIClauseZoneProps {
  contractDetails: ContractDetails
  clauses: AIClause[]
  onClausesChange: (clauses: AIClause[]) => void
  startingSection?: string  // From template config, e.g., "12.1"
  autoDetectedSection?: string  // From PDF generator logic
  onClose?: () => void  // Close/collapse the clause zone
  inModal?: boolean  // If true, render without container styling (used when inside a Dialog)
}

type ZoneState = 'empty' | 'generating' | 'review' | 'approved'

export function InlineAIClauseZone({
  contractDetails,
  clauses,
  onClausesChange,
  startingSection,
  autoDetectedSection,
  onClose,
  inModal = false,
}: InlineAIClauseZoneProps) {
  const [situation, setSituation] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingClauses, setPendingClauses] = useState<AIClause[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Determine the current state
  const getZoneState = (): ZoneState => {
    if (isGenerating) return 'generating'
    if (pendingClauses.length > 0) return 'review'
    if (clauses.length > 0) return 'approved'
    return 'empty'
  }

  const state = getZoneState()

  // Get starting section number
  const sectionStart = startingSection || autoDetectedSection || '12.1'
  const [majorSection, minorSection] = sectionStart.split('.').map(n => parseInt(n, 10))

  const handleGenerate = async () => {
    if (!situation.trim() || situation.trim().length < 10) {
      setError('Please describe your situation in more detail (at least 10 characters)')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate-clauses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          situation,
          contractDetails,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate clauses')
      }

      const data = await res.json()

      if (data.clauses && data.clauses.length > 0) {
        // Set all generated clauses as pending review
        setPendingClauses(data.clauses.map((c: AIClause) => ({ ...c, status: 'pending' as const })))
      } else {
        setError('AI did not generate any clauses. Please try describing your situation with more detail.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate clauses')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = (id: string) => {
    setPendingClauses(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'approved' as const } : c
    ))
  }

  const handleReject = (id: string) => {
    setPendingClauses(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'rejected' as const } : c
    ))
  }

  const startEditing = (clause: AIClause) => {
    setEditingId(clause.id)
    setEditContent(clause.editedContent || clause.content)
  }

  const saveEdit = (id: string) => {
    setPendingClauses(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'edited' as const, editedContent: editContent } : c
    ))
    setEditingId(null)
    setEditContent('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent('')
  }

  const handleConfirmApproved = () => {
    // Move approved/edited clauses to the main clauses list
    const approvedClauses = pendingClauses.filter(c => c.status === 'approved' || c.status === 'edited')
    onClausesChange([...clauses, ...approvedClauses])
    setPendingClauses([])
    setSituation('')
  }

  const handleRemoveApprovedClause = (id: string) => {
    onClausesChange(clauses.filter(c => c.id !== id))
  }

  const handleEditApprovedClause = (id: string) => {
    const clause = clauses.find(c => c.id === id)
    if (clause) {
      setEditingId(id)
      setEditContent(clause.editedContent || clause.content)
    }
  }

  const saveApprovedEdit = (id: string) => {
    onClausesChange(clauses.map(c =>
      c.id === id ? { ...c, editedContent: editContent, status: 'edited' as const } : c
    ))
    setEditingId(null)
    setEditContent('')
  }

  const handleGenerateMore = () => {
    // Reset to empty state to allow generating more
    setSituation('')
    setPendingClauses([])
    setError(null)
  }

  const pendingCount = pendingClauses.filter(c => c.status === 'pending').length
  const approvedCount = pendingClauses.filter(c => c.status === 'approved' || c.status === 'edited').length

  const getClauseNumber = (index: number, isApproved: boolean = false) => {
    const baseIndex = isApproved ? index : clauses.length + index
    return `${majorSection}.${minorSection + baseIndex}`
  }

  // Show compact button when empty and not expanded (only when not opened from a zone button)
  if (state === 'empty' && !isExpanded && !onClose) {
    return (
      <div className="ai-clause-zone-container my-4">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          className="w-full border-2 border-dashed border-[var(--primary-300)] bg-[var(--primary-50)] hover:bg-[var(--primary-100)] text-[var(--primary-700)] py-3"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate AI Clauses
        </Button>
      </div>
    )
  }

  return (
    <div className={inModal ? "" : "ai-clause-zone-container border-2 border-dashed border-[var(--primary-300)] rounded-lg bg-[var(--primary-50)] p-4 my-4"}>
      {/* Header - only show if not in modal (modal has its own header) */}
      {!inModal && (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--primary-700)]" />
          <span className="font-semibold text-sm text-[var(--gray-900)]">AI-Generated Clauses</span>
        </div>
        <div className="flex items-center gap-2">
          {state === 'approved' && (
            <Button
              onClick={handleGenerateMore}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add More
            </Button>
          )}
          {state === 'review' && (
            <Button
              onClick={handleGenerateMore}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Generate More
            </Button>
          )}
          {(state === 'empty' || onClose) && (
            <button
              onClick={() => {
                setIsExpanded(false)
                onClose?.()
              }}
              className="p-1 hover:bg-[var(--primary-100)] rounded text-[var(--gray-500)]"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      )}

      {/* Divider - only show if not in modal */}
      {!inModal && <div className="border-t border-[var(--primary-200)] mb-4" />}

      {/* State: Empty (expanded) - Show input form */}
      {state === 'empty' && (
        <div className="space-y-3">
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Describe your situation to generate custom clauses (e.g., roof damage credit, tenant with lease...)"
            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] bg-white"
          />
          {error && (
            <div className="p-2 bg-[var(--error-100)] border border-[var(--error-300)] rounded text-sm text-[var(--error-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={!situation.trim() || situation.trim().length < 10}
              className="bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white"
              size="sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Clauses
            </Button>
          </div>
        </div>
      )}

      {/* State: Generating */}
      {state === 'generating' && (
        <div className="flex items-center justify-center py-8 text-[var(--primary-700)]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm font-medium">Generating clauses...</span>
        </div>
      )}

      {/* State: Review - Show pending clauses for approval */}
      {state === 'review' && (
        <div className="space-y-3">
          {/* Already approved clauses */}
          {clauses.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[var(--gray-600)] mb-2 font-medium">Previously Approved:</p>
              {clauses.map((clause, index) => (
                <ApprovedClauseDisplay
                  key={clause.id}
                  clause={clause}
                  number={getClauseNumber(index, true)}
                  onEdit={() => handleEditApprovedClause(clause.id)}
                  onRemove={() => handleRemoveApprovedClause(clause.id)}
                  isEditing={editingId === clause.id}
                  editContent={editContent}
                  onEditContentChange={setEditContent}
                  onSaveEdit={() => saveApprovedEdit(clause.id)}
                  onCancelEdit={cancelEdit}
                />
              ))}
            </div>
          )}

          {/* Pending review clauses */}
          <p className="text-xs text-[var(--gray-600)] mb-2 font-medium">
            Review Generated Clauses ({approvedCount} approved, {pendingCount} pending):
          </p>
          {pendingClauses.map((clause, index) => (
            <PendingClauseCard
              key={clause.id}
              clause={clause}
              number={getClauseNumber(index)}
              onApprove={() => handleApprove(clause.id)}
              onReject={() => handleReject(clause.id)}
              onEdit={() => startEditing(clause)}
              isEditing={editingId === clause.id}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onSaveEdit={() => saveEdit(clause.id)}
              onCancelEdit={cancelEdit}
            />
          ))}

          {/* Error display */}
          {error && (
            <div className="p-2 bg-[var(--error-100)] border border-[var(--error-300)] rounded text-sm text-[var(--error-700)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-[var(--primary-200)] space-y-3">
            {pendingCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  <strong>Step 1:</strong> Click the <Check className="w-4 h-4 inline mx-1" /> checkmark on each clause you want to keep, or <X className="w-4 h-4 inline mx-1" /> to reject.
                </p>
              </div>
            )}
            {pendingCount === 0 && approvedCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
                <p className="text-sm text-green-800">
                  <strong>Ready!</strong> {approvedCount} clause{approvedCount !== 1 ? 's' : ''} approved. Click below to add to your contract.
                </p>
                <Button
                  onClick={handleConfirmApproved}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Add {approvedCount} Clause{approvedCount !== 1 ? 's' : ''} to Contract
                </Button>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center justify-end">
                <Button
                  onClick={handleConfirmApproved}
                  disabled={true}
                  className="bg-gray-300 text-gray-500 cursor-not-allowed"
                  size="default"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve all clauses first
                </Button>
              </div>
            )}
            {inModal && pendingCount === 0 && (
              <div className="flex justify-center">
                <Button
                  onClick={handleGenerateMore}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Generate More Clauses
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* State: Approved - Show confirmed clauses */}
      {state === 'approved' && (
        <div className="space-y-3">
          {clauses.map((clause, index) => (
            <ApprovedClauseDisplay
              key={clause.id}
              clause={clause}
              number={getClauseNumber(index, true)}
              onEdit={() => handleEditApprovedClause(clause.id)}
              onRemove={() => handleRemoveApprovedClause(clause.id)}
              isEditing={editingId === clause.id}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onSaveEdit={() => saveApprovedEdit(clause.id)}
              onCancelEdit={cancelEdit}
            />
          ))}
          {/* Action buttons for modal mode */}
          {inModal && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleGenerateMore}
                variant="outline"
                size="sm"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add More Clauses
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer - only show when clauses are present */}
      {(state === 'review' || state === 'approved') && (
        <div className="mt-4 pt-3 border-t border-[var(--primary-200)]">
          <p className="text-xs text-[var(--warning-700)] flex items-start gap-1">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            AI-generated clauses are suggestions only. Have them reviewed by a licensed attorney.
          </p>
        </div>
      )}
    </div>
  )
}

// Pending clause card component for review state
function PendingClauseCard({
  clause,
  number,
  onApprove,
  onReject,
  onEdit,
  isEditing,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
}: {
  clause: AIClause
  number: string
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
  isEditing: boolean
  editContent: string
  onEditContentChange: (content: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
}) {
  const isRejected = clause.status === 'rejected'
  const isApproved = clause.status === 'approved' || clause.status === 'edited'

  return (
    <div className={`border rounded-lg bg-white overflow-hidden ${isRejected ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between ${
        isApproved ? 'bg-[var(--success-50)] border-b border-[var(--success-200)]' :
        isRejected ? 'bg-[var(--gray-50)] border-b border-[var(--gray-200)]' :
        'bg-[var(--warning-50)] border-b border-[var(--warning-200)]'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[var(--gray-600)]">{number}</span>
          <span className="text-sm font-medium text-[var(--gray-900)]">{clause.title}</span>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1">
            {!isRejected && !isApproved && (
              <button
                onClick={onApprove}
                className="p-1.5 hover:bg-[var(--success-100)] rounded text-[var(--success-700)]"
                title="Approve"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            {!isRejected && (
              <button
                onClick={onEdit}
                className="p-1.5 hover:bg-[var(--gray-100)] rounded text-[var(--gray-600)]"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {!isRejected && (
              <button
                onClick={onReject}
                className="p-1.5 hover:bg-[var(--error-100)] rounded text-[var(--error-700)]"
                title="Reject"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {isRejected && (
              <button
                onClick={onApprove}
                className="px-2 py-1 text-xs bg-[var(--gray-100)] hover:bg-[var(--gray-200)] rounded text-[var(--gray-700)]"
              >
                Restore
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit} className="bg-[var(--primary-700)]">
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--gray-700)] whitespace-pre-wrap">
            {clause.editedContent || clause.content}
          </p>
        )}
      </div>
    </div>
  )
}

// Approved clause display component
function ApprovedClauseDisplay({
  clause,
  number,
  onEdit,
  onRemove,
  isEditing,
  editContent,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
}: {
  clause: AIClause
  number: string
  onEdit: () => void
  onRemove: () => void
  isEditing: boolean
  editContent: string
  onEditContentChange: (content: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
}) {
  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between bg-white border-b border-[var(--gray-200)]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[var(--gray-600)]">{number}</span>
          <span className="text-sm font-medium text-[var(--gray-900)]">{clause.title}</span>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-[var(--gray-100)] rounded text-[var(--gray-600)]"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-[var(--error-100)] rounded text-[var(--error-700)]"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => onEditContentChange(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onSaveEdit} className="bg-[var(--primary-700)]">
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--gray-700)] whitespace-pre-wrap">
            {clause.editedContent || clause.content}
          </p>
        )}
      </div>
    </div>
  )
}
