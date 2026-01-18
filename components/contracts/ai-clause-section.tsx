'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, X, Check, AlertTriangle, Pencil } from 'lucide-react'
import { ClauseReviewModal, AIClause } from './clause-review-modal'

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

interface AIClauseSectionProps {
  contractDetails: ContractDetails
  approvedClauses: AIClause[]
  onClausesChange: (clauses: AIClause[]) => void
}

export function AIClauseSection({
  contractDetails,
  approvedClauses,
  onClausesChange,
}: AIClauseSectionProps) {
  const [situation, setSituation] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedClauses, setGeneratedClauses] = useState<AIClause[]>([])
  const [showReviewModal, setShowReviewModal] = useState(false)

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

      // Only open modal if we have clauses to review
      if (data.clauses && data.clauses.length > 0) {
        setGeneratedClauses(data.clauses)
        setShowReviewModal(true)
      } else {
        setError('AI did not generate any clauses. Please try describing your situation with more detail.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate clauses')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApproveAll = (approved: AIClause[]) => {
    onClausesChange([...approvedClauses, ...approved])
    setShowReviewModal(false)
    setGeneratedClauses([])
    setSituation('')
  }

  const handleCloseModal = () => {
    setShowReviewModal(false)
    setGeneratedClauses([])
  }

  const handleRemoveClause = (id: string) => {
    onClausesChange(approvedClauses.filter(c => c.id !== id))
  }

  const handleEditClause = (id: string, newContent: string) => {
    onClausesChange(approvedClauses.map(c =>
      c.id === id ? { ...c, editedContent: newContent, status: 'edited' as const } : c
    ))
  }

  return (
    <div className="border-t border-[var(--gray-200)] pt-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[var(--primary-700)]" />
        <h3 className="text-sm font-semibold text-[var(--gray-900)]">
          AI-Generated Contract Clauses
        </h3>
      </div>

      {/* Already approved clauses */}
      {approvedClauses.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs text-[var(--gray-600)] mb-2">
            {approvedClauses.length} custom clause{approvedClauses.length > 1 ? 's' : ''} will be added to this contract:
          </p>
          {approvedClauses.map((clause, index) => (
            <ApprovedClauseCard
              key={clause.id}
              clause={clause}
              index={index}
              onRemove={() => handleRemoveClause(clause.id)}
              onEdit={(newContent) => handleEditClause(clause.id, newContent)}
            />
          ))}
        </div>
      )}

      {/* Input section */}
      <div className="bg-[var(--gray-50)] rounded-lg p-4">
        <label className="block text-sm text-[var(--gray-700)] mb-2">
          Describe your unique situation with this deal
        </label>
        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="Example: The property has some roof damage that the seller agreed to credit $5,000 at closing. There's also a tenant living there with a month-to-month lease who needs 30 days notice to vacate..."
          className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
          disabled={isGenerating}
        />

        {error && (
          <div className="mt-2 p-2 bg-[var(--error-100)] border border-[var(--error-700)] rounded text-sm text-[var(--error-700)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-[var(--gray-500)]">
            AI will generate custom clauses based on your description
          </p>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !situation.trim()}
            className="bg-[var(--primary-700)] hover:bg-[var(--primary-800)] text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Clauses
              </>
            )}
          </Button>
        </div>

        <p className="mt-3 text-xs text-[var(--warning-700)] flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          AI-generated clauses are suggestions only. Have them reviewed by a licensed attorney.
        </p>
      </div>

      {/* Review Modal */}
      <ClauseReviewModal
        isOpen={showReviewModal}
        clauses={generatedClauses}
        onClose={handleCloseModal}
        onApproveAll={handleApproveAll}
      />
    </div>
  )
}

function ApprovedClauseCard({
  clause,
  index,
  onRemove,
  onEdit,
}: {
  clause: AIClause
  index: number
  onRemove: () => void
  onEdit: (content: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(clause.editedContent || clause.content)

  const handleSave = () => {
    onEdit(editContent)
    setIsEditing(false)
  }

  return (
    <div className="border border-[var(--gray-200)] rounded-lg bg-white">
      <div className="px-3 py-2 border-b border-[var(--gray-200)] flex items-center justify-between bg-[var(--success-50)]">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-[var(--success-700)]" />
          <span className="text-sm font-medium text-[var(--gray-900)]">
            {clause.title}
          </span>
          <span className="text-xs text-[var(--gray-500)]">
            (Clause #{index + 1})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:bg-[var(--gray-100)] rounded"
            title="Edit"
          >
            <Pencil className="w-4 h-4 text-[var(--gray-500)]" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-[var(--error-100)] rounded"
            title="Remove"
          >
            <X className="w-4 h-4 text-[var(--error-700)]" />
          </button>
        </div>
      </div>
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[80px]"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
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
