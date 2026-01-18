'use client'

import {
  Save,
  RotateCcw,
  Eye,
  Code,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useState, useEffect } from 'react'

interface TemplateEditorProps {
  content: string
  onSave: (html: string) => Promise<void>
  onReset: () => Promise<void>
  isCustomized: boolean
  templateLabel: string
  isSaving?: boolean
}

export function TemplateEditor({
  content,
  onSave,
  onReset,
  isCustomized,
  templateLabel,
  isSaving = false
}: TemplateEditorProps) {
  const [hasChanges, setHasChanges] = useState(false)
  const [originalContent, setOriginalContent] = useState(content)
  const [editedContent, setEditedContent] = useState(content)
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code')

  // Update content when prop changes
  useEffect(() => {
    if (content !== originalContent) {
      setEditedContent(content)
      setOriginalContent(content)
      setHasChanges(false)
    }
  }, [content, originalContent])

  const handleContentChange = useCallback((newContent: string) => {
    setEditedContent(newContent)
    setHasChanges(newContent !== originalContent)
  }, [originalContent])

  const handleSave = useCallback(async () => {
    await onSave(editedContent)
    setOriginalContent(editedContent)
    setHasChanges(false)
  }, [editedContent, onSave])

  const handleReset = useCallback(async () => {
    if (!confirm('This will reset the template to the General template. Any customizations will be lost. Continue?')) {
      return
    }
    await onReset()
  }, [onReset])

  const handleDiscard = useCallback(() => {
    setEditedContent(originalContent)
    setHasChanges(false)
  }, [originalContent])

  return (
    <div className="border border-[var(--gray-200)] rounded-lg overflow-hidden bg-white">
      {/* Header with template label */}
      <div className="px-4 py-3 bg-[var(--gray-50)] border-b border-[var(--gray-200)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-[var(--gray-900)]">{templateLabel}</span>
          {isCustomized ? (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--primary-100)] text-[var(--primary-700)]">
              Customized
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--gray-100)] text-[var(--gray-600)]">
              Using General Template
            </span>
          )}
          {hasChanges && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-[var(--warning-100)] text-[var(--warning-700)]">
              Unsaved Changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCustomized && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs"
              disabled={isSaving}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset to General
            </Button>
          )}
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscard}
              className="text-xs"
              disabled={isSaving}
            >
              Discard
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="text-xs bg-[var(--primary-700)]"
          >
            <Save className="w-3 h-3 mr-1" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="px-4 py-2 border-b border-[var(--gray-200)] flex items-center gap-2 bg-white">
        <button
          onClick={() => setViewMode('code')}
          className={`
            px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors
            ${viewMode === 'code'
              ? 'bg-[var(--primary-100)] text-[var(--primary-700)]'
              : 'hover:bg-[var(--gray-100)] text-[var(--gray-600)]'
            }
          `}
        >
          <Code className="w-4 h-4" />
          HTML Code
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`
            px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors
            ${viewMode === 'preview'
              ? 'bg-[var(--primary-100)] text-[var(--primary-700)]'
              : 'hover:bg-[var(--gray-100)] text-[var(--gray-600)]'
            }
          `}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      {/* Editor/Preview Content */}
      <div className="bg-white min-h-[600px]">
        {viewMode === 'code' ? (
          <textarea
            value={editedContent}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full h-[600px] p-4 font-mono text-sm border-0 resize-none focus:outline-none focus:ring-0 bg-[var(--gray-50)]"
            spellCheck={false}
            placeholder="Enter HTML template content..."
          />
        ) : (
          <div className="p-4 h-[600px] overflow-auto">
            <div
              className="bg-white border border-[var(--gray-200)] rounded shadow-sm p-8 max-w-[8.5in] mx-auto"
              style={{ minHeight: '11in' }}
            >
              <div dangerouslySetInnerHTML={{ __html: editedContent }} />
            </div>
          </div>
        )}
      </div>

      {/* Footer with help text */}
      <div className="px-4 py-2 border-t border-[var(--gray-200)] bg-[var(--gray-50)]">
        <p className="text-xs text-[var(--gray-500)]">
          <strong>Placeholders:</strong>{' '}
          <code className="bg-[var(--gray-200)] px-1 rounded">{'{{property_address}}'}</code>,{' '}
          <code className="bg-[var(--gray-200)] px-1 rounded">{'{{seller_name}}'}</code>,{' '}
          <code className="bg-[var(--gray-200)] px-1 rounded">{'{{purchase_price}}'}</code>,{' '}
          <code className="bg-[var(--gray-200)] px-1 rounded">{'{{buyer_signature_img}}'}</code>,{' '}
          <code className="bg-[var(--gray-200)] px-1 rounded">{'{{ai_clauses}}'}</code>
        </p>
      </div>
    </div>
  )
}
