'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, AlertCircle, ChevronDown, ChevronRight, Edit3 } from 'lucide-react'
import { TemplateEditor } from '@/components/templates/template-editor'

interface StateTemplate {
  id: string
  state_code: string
  state_name: string
  is_general: boolean
  purchase_agreement_html: string | null
  is_purchase_customized: boolean
  use_general_template: boolean
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<StateTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [editorContent, setEditorContent] = useState<string>('')
  const [isCustomized, setIsCustomized] = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandStates, setExpandStates] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data)

      // Auto-select General template
      const general = data.find((t: StateTemplate) => t.is_general)
      if (general) {
        loadTemplateContent(general.state_code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplateContent = useCallback(async (stateCode: string) => {
    setLoadingContent(true)
    setSelectedState(stateCode)
    setError(null)

    try {
      const res = await fetch(`/api/templates/${stateCode}`)
      if (!res.ok) throw new Error('Failed to load template content')
      const data = await res.json()

      setEditorContent(data.html || '')
      setIsCustomized(data.isCustomized || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoadingContent(false)
    }
  }, [])

  const handleSave = useCallback(async (html: string) => {
    if (!selectedState) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/templates/${selectedState}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_agreement_html: html }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save template')
      }

      // Refresh templates list to update badges
      await fetchTemplates()
      setIsCustomized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }, [selectedState])

  const handleReset = useCallback(async () => {
    if (!selectedState) return

    setIsSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/templates/${selectedState}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_to_general: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reset template')
      }

      // Reload the template content to get the general template
      await loadTemplateContent(selectedState)
      await fetchTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset template')
    } finally {
      setIsSaving(false)
    }
  }, [selectedState, loadTemplateContent])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner"></div>
      </div>
    )
  }

  const generalTemplate = templates.find(t => t.is_general)
  const stateTemplates = templates.filter(t => !t.is_general)
  const selectedTemplate = templates.find(t => t.state_code === selectedState)

  const getTemplateLabel = () => {
    if (!selectedTemplate) return 'Select a Template'
    if (selectedTemplate.is_general) return 'General Template (Default)'
    if (isCustomized) return `${selectedTemplate.state_name} Template`
    return `${selectedTemplate.state_name} (Using General Template)`
  }

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Left sidebar - Template selector */}
      <div className="w-64 border-r border-[var(--gray-200)] bg-white overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-[var(--gray-200)]">
          <h1 className="text-lg font-bold text-[var(--gray-900)]">Templates</h1>
          <p className="text-xs text-[var(--gray-600)] mt-1">
            Edit contract templates
          </p>
        </div>

        {/* General Template */}
        {generalTemplate && (
          <div className="p-2">
            <button
              onClick={() => loadTemplateContent(generalTemplate.state_code)}
              className={`
                w-full px-3 py-2 rounded text-left flex items-center gap-2 transition-colors
                ${selectedState === generalTemplate.state_code
                  ? 'bg-[var(--primary-50)] text-[var(--primary-700)] border border-[var(--primary-700)]'
                  : 'hover:bg-[var(--gray-100)] text-[var(--gray-700)]'
                }
              `}
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">General Template</div>
                <div className="text-xs text-[var(--gray-500)]">Default for all states</div>
              </div>
            </button>
          </div>
        )}

        {/* States section */}
        <div className="p-2 border-t border-[var(--gray-200)]">
          <button
            onClick={() => setExpandStates(!expandStates)}
            className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded"
          >
            <span>State Templates</span>
            {expandStates ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {expandStates && (
            <div className="mt-1 space-y-0.5">
              {stateTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => loadTemplateContent(template.state_code)}
                  className={`
                    w-full px-3 py-1.5 rounded text-left flex items-center gap-2 transition-colors text-sm
                    ${selectedState === template.state_code
                      ? 'bg-[var(--primary-50)] text-[var(--primary-700)]'
                      : 'hover:bg-[var(--gray-100)] text-[var(--gray-700)]'
                    }
                  `}
                >
                  <span className="flex-1 truncate">{template.state_name}</span>
                  {template.is_purchase_customized && (
                    <span title="Customized">
                      <Edit3 className="w-3 h-3 text-[var(--primary-700)]" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content - Editor */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-3 bg-[var(--error-100)] border border-[var(--error-700)] rounded text-sm text-[var(--error-700)] flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loadingContent ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner"></div>
          </div>
        ) : selectedState ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[var(--gray-900)]">
                Purchase Agreement
              </h2>
              <p className="text-sm text-[var(--gray-600)] mt-1">
                Edit the template content below. Changes are saved per state.
              </p>
            </div>

            <TemplateEditor
              content={editorContent}
              onSave={handleSave}
              onReset={handleReset}
              isCustomized={isCustomized}
              templateLabel={getTemplateLabel()}
              isSaving={isSaving}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-[var(--gray-500)]">
            Select a template from the sidebar to edit
          </div>
        )}
      </div>
    </div>
  )
}
