'use client'

import {
  Save,
  RotateCcw,
  Eye,
  Code,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useState, useEffect, useRef } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [aiClauseSection, setAiClauseSection] = useState('')
  const [aiClausePopoverOpen, setAiClausePopoverOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleInsertAIClauseZone = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const sectionAttr = aiClauseSection.trim() || 'auto'
    const htmlToInsert = `
<!-- AI_CLAUSES_START section="${sectionAttr}" -->
<div class="ai-clause-zone" data-section="${sectionAttr}">
  {{ai_clauses}}
</div>
<!-- AI_CLAUSES_END -->
`

    // Get cursor position
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = editedContent.substring(0, start)
    const after = editedContent.substring(end)

    // Insert at cursor
    const newContent = before + htmlToInsert + after
    handleContentChange(newContent)

    // Reset and close popover
    setAiClauseSection('')
    setAiClausePopoverOpen(false)

    // Focus textarea and set cursor after inserted content
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + htmlToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [aiClauseSection, editedContent, handleContentChange])

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

      {/* View Toggle and AI Clause Insert */}
      <div className="px-4 py-2 border-b border-[var(--gray-200)] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
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

        {/* AI Clause Zone Insert Button - Only visible in code mode */}
        {viewMode === 'code' && (
          <Popover open={aiClausePopoverOpen} onOpenChange={setAiClausePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                className="px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1.5 transition-colors bg-[var(--primary-50)] text-[var(--primary-700)] hover:bg-[var(--primary-100)] border border-[var(--primary-200)]"
              >
                <Sparkles className="w-4 h-4" />
                Insert AI Clause Zone
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-[var(--gray-900)]">AI Clause Zone</h4>
                  <p className="text-xs text-[var(--gray-600)] mt-1">
                    This marks where AI-generated clauses will appear in the document.
                  </p>
                </div>

                <div>
                  <Label htmlFor="section-number" className="text-xs text-[var(--gray-700)]">
                    Starting Section # (optional)
                  </Label>
                  <Input
                    id="section-number"
                    value={aiClauseSection}
                    onChange={(e) => setAiClauseSection(e.target.value)}
                    placeholder="Auto-detect (e.g., 12.1)"
                    className="mt-1"
                  />
                  <p className="text-xs text-[var(--gray-500)] mt-1">
                    Leave blank to auto-detect from preceding sections
                  </p>
                </div>

                <div className="bg-[var(--gray-50)] rounded p-2 text-xs font-mono text-[var(--gray-600)]">
                  <code>{'<div class="ai-clause-zone">'}</code><br />
                  <code className="ml-2">{'{{ai_clauses}}'}</code><br />
                  <code>{'</div>'}</code>
                </div>

                <Button
                  onClick={handleInsertAIClauseZone}
                  className="w-full bg-[var(--primary-700)] hover:bg-[var(--primary-800)]"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Insert at Cursor
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Editor/Preview Content */}
      <div className="bg-white min-h-[600px]">
        {viewMode === 'code' ? (
          <textarea
            ref={textareaRef}
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
