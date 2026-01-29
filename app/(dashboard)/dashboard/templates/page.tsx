'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Plus,
  Search,
  Tag,
  Copy,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  FileCode,
  Eye,
  ExternalLink,
  FileSearch,
} from 'lucide-react'
import {
  CompanyTemplate,
  CustomField,
  TemplateFieldConfig,
  StandardFieldKey,
  DEFAULT_FIELD_CONFIG,
  STANDARD_FIELDS_METADATA,
} from '@/types/database'

interface PlaceholderInfo {
  label: string
  category: string
}

export default function TemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<CompanyTemplate[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [standardPlaceholders, setStandardPlaceholders] = useState<Record<string, PlaceholderInfo>>({})
  const [loading, setLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CompanyTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<CompanyTemplate | null>(null)

  // Fetch templates
  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedTag) params.set('tag', selectedTag)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/company-templates?${params}`)
      const data = await res.json()

      if (data.templates) {
        setTemplates(data.templates)
        setAvailableTags(data.availableTags || [])
        setStandardPlaceholders(data.standardPlaceholders || {})
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [selectedTag, searchQuery])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const res = await fetch(`/api/company-templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
    }
  }

  const handleCopy = async (id: string) => {
    try {
      const res = await fetch(`/api/company-templates/${id}/copy`, { method: 'POST' })
      if (res.ok) {
        fetchTemplates()
      }
    } catch (error) {
      console.error('Failed to copy template:', error)
    }
  }

  const handleUseTemplate = (template: CompanyTemplate) => {
    // Navigate to contract creation with template ID
    router.push(`/dashboard/contracts/new?templateId=${template.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--gray-900)]">Templates</h1>
          <p className="text-sm text-[var(--gray-600)]">
            Create and manage contract templates for your team
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTemplate(null)
            setShowEditor(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gray-400)]" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent"
          />
        </div>

        {/* Tag Filter */}
        <div className="relative">
          <select
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
            className="appearance-none pl-10 pr-10 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] focus:border-transparent bg-white"
          >
            <option value="">All Tags</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gray-400)]" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--gray-400)]" />
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--primary-600)] border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-[var(--gray-600)]">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[var(--gray-200)] rounded-lg">
          <FileText className="h-12 w-12 text-[var(--gray-400)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">No templates found</h3>
          <p className="text-sm text-[var(--gray-600)] mb-4">
            {searchQuery || selectedTag
              ? 'Try adjusting your filters'
              : 'Create your first template to get started'}
          </p>
          {!searchQuery && !selectedTag && (
            <button
              onClick={() => setShowEditor(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)]"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white border border-[var(--gray-200)] rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (template.is_example) {
                  setPreviewTemplate(template)
                } else {
                  setEditingTemplate(template)
                  setShowEditor(true)
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[var(--primary-50)] rounded-lg">
                    <FileText className="h-5 w-5 text-[var(--primary-600)]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--gray-900)]">
                      {template.name}
                      {template.is_example && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--primary-100)] text-[var(--primary-700)] rounded-full">
                          Example
                        </span>
                      )}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-[var(--gray-600)] mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-[var(--gray-100)] text-[var(--gray-700)] rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Signature Layout */}
              <div className="text-xs text-[var(--gray-500)] mb-3">
                Signature: {template.signature_layout === 'two-column' ? 'Two Column Purchase' :
                  template.signature_layout === 'two-column-assignment' ? 'Two Column Assignment' :
                  template.signature_layout === 'seller-only' ? 'Seller Only' :
                  template.signature_layout === 'three-party' ? 'Three Party' : template.signature_layout}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--gray-100)]" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleUseTemplate(template)}
                  className="flex items-center gap-1 text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Use Template
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-1.5 text-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded"
                    title="Preview template"
                  >
                    <FileSearch className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(template.id)}
                    className="p-1.5 text-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded"
                    title="Copy template"
                  >
                    <Copy className="h-4 w-4" />
                  </button>

                  {!template.is_example && (
                    <>
                      <button
                        onClick={() => {
                          setEditingTemplate(template)
                          setShowEditor(true)
                        }}
                        className="p-1.5 text-[var(--gray-500)] hover:text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded"
                        title="Edit template"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-1.5 text-[var(--gray-500)] hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          standardPlaceholders={standardPlaceholders}
          onClose={() => {
            setShowEditor(false)
            setEditingTemplate(null)
          }}
          onSave={() => {
            setShowEditor(false)
            setEditingTemplate(null)
            fetchTemplates()
          }}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onEdit={() => {
            if (!previewTemplate.is_example) {
              setEditingTemplate(previewTemplate)
              setShowEditor(true)
            }
            setPreviewTemplate(null)
          }}
          onCopy={() => {
            handleCopy(previewTemplate.id)
            setPreviewTemplate(null)
          }}
          onUse={() => {
            handleUseTemplate(previewTemplate)
          }}
        />
      )}
    </div>
  )
}

// Template Editor Component
function TemplateEditor({
  template,
  standardPlaceholders,
  onClose,
  onSave,
}: {
  template: CompanyTemplate | null
  standardPlaceholders: Record<string, PlaceholderInfo>
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [tags, setTags] = useState<string[]>(template?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [htmlContent, setHtmlContent] = useState(template?.html_content || getStarterHtml())
  const [signatureLayout, setSignatureLayout] = useState(template?.signature_layout || 'two-column')
  const [customFields, setCustomFields] = useState<CustomField[]>(template?.custom_fields || [])
  const [fieldConfig, setFieldConfig] = useState<TemplateFieldConfig>(
    template?.field_config || DEFAULT_FIELD_CONFIG
  )
  const [showFieldConfig, setShowFieldConfig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPlaceholderPicker, setShowPlaceholderPicker] = useState(false)

  // Content entry mode
  const [plainTextInput, setPlainTextInput] = useState('')
  const [isGeneratingHtml, setIsGeneratingHtml] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [showHtmlEditor, setShowHtmlEditor] = useState(!!template?.html_content) // Show HTML editor if editing existing template
  const [hasGeneratedHtml, setHasGeneratedHtml] = useState(!!template?.html_content)

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleAddCustomField = () => {
    const key = `custom_${Date.now()}`
    setCustomFields([
      ...customFields,
      { key, label: '', fieldType: 'text', required: false },
    ])
  }

  const handleUpdateCustomField = (index: number, updates: Partial<CustomField>) => {
    const newFields = [...customFields]
    newFields[index] = { ...newFields[index], ...updates }

    // Update key based on label
    if (updates.label !== undefined) {
      newFields[index].key = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    }

    setCustomFields(newFields)
  }

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const handleFieldConfigChange = (
    fieldKey: StandardFieldKey,
    property: 'visible' | 'required',
    value: boolean
  ) => {
    setFieldConfig((prev) => ({
      ...prev,
      standardFields: {
        ...prev.standardFields,
        [fieldKey]: {
          visible: prev.standardFields[fieldKey]?.visible ?? true,
          required: prev.standardFields[fieldKey]?.required ?? false,
          [property]: value,
        },
      },
    }))
  }

  const getFieldConfig = (fieldKey: StandardFieldKey) => {
    return fieldConfig.standardFields[fieldKey] || { visible: true, required: false }
  }

  // Group standard fields by category
  const fieldsByGroup = STANDARD_FIELDS_METADATA.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = []
    acc[field.group].push(field)
    return acc
  }, {} as Record<string, typeof STANDARD_FIELDS_METADATA>)

  const groupLabels: Record<string, string> = {
    property: 'Property Information',
    seller: 'Seller Information',
    buyer: 'End Buyer Information',
    financial: 'Financial Details',
    escrow: 'Escrow Information',
    terms: 'Contract Terms',
    closing: 'Closing Costs',
  }

  const insertPlaceholder = (key: string) => {
    const placeholder = `{{${key}}}`
    setHtmlContent(htmlContent + placeholder)
    setShowPlaceholderPicker(false)
  }

  // Generate HTML from plain text using AI
  const handleGenerateHtml = async () => {
    if (!plainTextInput.trim()) {
      setGenerationError('Please enter your contract text first')
      return
    }

    setIsGeneratingHtml(true)
    setGenerationError('')

    try {
      const res = await fetch('/api/ai/generate-template-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plainText: plainTextInput,
          placeholders: Object.entries(standardPlaceholders).map(([key, info]) => ({
            key,
            label: info.label,
            category: info.category,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate template')
      }

      // Set the generated HTML
      setHtmlContent(data.html)
      setHasGeneratedHtml(true)
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate template')
    } finally {
      setIsGeneratingHtml(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Template name is required')
      return
    }
    if (!htmlContent.trim()) {
      alert('HTML content is required')
      return
    }

    setSaving(true)
    try {
      const url = template
        ? `/api/company-templates/${template.id}`
        : '/api/company-templates'
      const method = template ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          tags,
          html_content: htmlContent,
          signature_layout: signatureLayout,
          custom_fields: customFields.filter((f) => f.label.trim()),
          field_config: fieldConfig,
        }),
      })

      if (res.ok) {
        onSave()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save template')
      }
    } catch (error) {
      console.error('Failed to save template:', error)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Group placeholders by category
  const placeholdersByCategory: Record<string, Array<{ key: string; label: string }>> = {}
  Object.entries(standardPlaceholders).forEach(([key, info]) => {
    if (!placeholdersByCategory[info.category]) {
      placeholdersByCategory[info.category] = []
    }
    placeholdersByCategory[info.category].push({ key, label: info.label })
  })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--gray-200)]">
          <h2 className="text-lg font-semibold text-[var(--gray-900)]">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--gray-100)] rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Settings */}
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  placeholder="e.g., Florida Purchase Agreement"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                  rows={2}
                  placeholder="Brief description of this template"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Tags
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--gray-100)] text-[var(--gray-700)] rounded-full text-sm"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                    placeholder="Add a tag..."
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-[var(--gray-100)] hover:bg-[var(--gray-200)] rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Signature Layout */}
              <div>
                <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                  Signature Page Layout *
                </label>
                <select
                  value={signatureLayout}
                  onChange={(e) => setSignatureLayout(e.target.value as CompanyTemplate['signature_layout'])}
                  className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]"
                >
                  <option value="two-column">Two Column Purchase (Seller + Buyer)</option>
                  <option value="two-column-assignment">Two Column Assignment (Assignee + Assignor)</option>
                  <option value="seller-only">Seller Only</option>
                  <option value="three-party">Three Party (Seller + Assignor + Assignee)</option>
                </select>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  {signatureLayout === 'two-column' && 'Standard layout with Seller and Buyer signatures side by side'}
                  {signatureLayout === 'two-column-assignment' && 'Assignment layout with Assignee and Assignor signatures side by side'}
                  {signatureLayout === 'seller-only' && 'Only Seller signs via Documenso. Buyer pre-signs.'}
                  {signatureLayout === 'three-party' && 'For assignments: Seller and Assignee sign via Documenso'}
                </p>
              </div>

              {/* Auto-generated Elements Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800 mb-2">What gets added automatically:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• <strong>Page footers</strong> - Seller & Buyer initials boxes added to each page</li>
                  <li>• <strong>"[SIGNATURES ON FOLLOWING PAGE]"</strong> - Added at the end of your content</li>
                  <li>• <strong>Signature page</strong> - Auto-generated based on your layout selection above</li>
                  <li>• <strong>Page breaks</strong> - Content automatically splits into pages</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2 italic">
                  You only need to write the contract content - the system handles pagination and signatures.
                </p>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--gray-700)]">
                    Custom Fields
                  </label>
                  <button
                    onClick={handleAddCustomField}
                    className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)]"
                  >
                    + Add Field
                  </button>
                </div>
                <p className="text-xs text-[var(--gray-500)] mb-2">
                  Custom fields will appear at the bottom of the contract form. Use {`{{field_key}}`} in your HTML.
                </p>
                <div className="space-y-2">
                  {customFields.map((field, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-[var(--gray-50)] rounded-lg"
                    >
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateCustomField(index, { label: e.target.value })}
                        className="flex-1 px-2 py-1 border border-[var(--gray-300)] rounded text-sm"
                        placeholder="Field label"
                      />
                      <select
                        value={field.fieldType}
                        onChange={(e) => handleUpdateCustomField(index, { fieldType: e.target.value as CustomField['fieldType'] })}
                        className="px-2 py-1 border border-[var(--gray-300)] rounded text-sm"
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="textarea">Long Text</option>
                      </select>
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleUpdateCustomField(index, { required: e.target.checked })}
                        />
                        Required
                      </label>
                      <button
                        onClick={() => handleRemoveCustomField(index)}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      {field.label && (
                        <span className="text-xs text-[var(--gray-400)]">
                          {`{{${field.key}}}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields Configuration */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowFieldConfig(!showFieldConfig)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <label className="block text-sm font-medium text-[var(--gray-700)]">
                    Form Field Settings
                  </label>
                  <ChevronDown
                    className={`h-4 w-4 text-[var(--gray-500)] transition-transform ${
                      showFieldConfig ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <p className="text-xs text-[var(--gray-500)] mt-1 mb-2">
                  Control which fields appear when creating a contract with this template
                </p>

                {showFieldConfig && (
                  <div className="border border-[var(--gray-200)] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                    {Object.entries(fieldsByGroup).map(([group, fields]) => (
                      <div key={group} className="border-b border-[var(--gray-100)] last:border-b-0">
                        <div className="px-3 py-2 bg-[var(--gray-50)] text-xs font-semibold text-[var(--gray-700)] sticky top-0">
                          {groupLabels[group]}
                        </div>
                        <div className="divide-y divide-[var(--gray-100)]">
                          {fields.map((field) => {
                            const config = getFieldConfig(field.key)
                            return (
                              <div
                                key={field.key}
                                className="flex items-center justify-between px-3 py-2 hover:bg-[var(--gray-50)]"
                              >
                                <span className="text-sm text-[var(--gray-700)]">{field.label}</span>
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-1.5 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={config.visible}
                                      onChange={(e) =>
                                        handleFieldConfigChange(field.key, 'visible', e.target.checked)
                                      }
                                      className="rounded border-[var(--gray-300)]"
                                    />
                                    <span className="text-[var(--gray-600)]">Visible</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={config.required}
                                      onChange={(e) =>
                                        handleFieldConfigChange(field.key, 'required', e.target.checked)
                                      }
                                      disabled={!config.visible}
                                      className="rounded border-[var(--gray-300)] disabled:opacity-50"
                                    />
                                    <span className={`${!config.visible ? 'text-[var(--gray-400)]' : 'text-[var(--gray-600)]'}`}>
                                      Required
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Contract Content */}
            <div className="space-y-4">
              {/* Contract Text Entry (shown when no HTML generated yet) */}
              {!hasGeneratedHtml && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--gray-700)] mb-1">
                      Contract Content *
                    </label>
                    <p className="text-xs text-[var(--gray-500)] mb-2">
                      Paste your contract text below. The system will automatically format it into a professional PDF.
                    </p>
                  </div>

                  <textarea
                    value={plainTextInput}
                    onChange={(e) => setPlainTextInput(e.target.value)}
                    placeholder="Paste your contract text here...

Example:
PURCHASE AGREEMENT

This agreement is made between [Seller Name] and [Buyer Company] for the property located at [Property Address].

1. PURCHASE PRICE
The purchase price is $[Amount] to be paid as follows...

2. CLOSING DATE
The closing shall occur on [Date]..."
                    className="w-full h-[400px] px-3 py-2 border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] text-sm"
                  />

                  {/* Error Message */}
                  {generationError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {generationError}
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateHtml}
                    disabled={isGeneratingHtml || !plainTextInput.trim()}
                    className="w-full px-4 py-3 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                  >
                    {isGeneratingHtml ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Formatting Template...
                      </>
                    ) : (
                      <>
                        <FileText className="h-5 w-5" />
                        Generate Template
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-[var(--gray-500)]">
                    Your text will be formatted into a professional legal document layout
                  </p>
                </div>
              )}

              {/* Template Generated - Show Preview & Edit Options */}
              {hasGeneratedHtml && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-full">
                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-[var(--gray-700)]">Template Ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setHasGeneratedHtml(false)
                          setHtmlContent(getStarterHtml())
                        }}
                        className="text-sm text-[var(--gray-600)] hover:text-[var(--gray-800)] flex items-center gap-1"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Start Over
                      </button>
                      <button
                        onClick={() => setShowHtmlEditor(!showHtmlEditor)}
                        className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)] flex items-center gap-1"
                      >
                        <FileCode className="h-4 w-4" />
                        {showHtmlEditor ? 'Hide HTML' : 'Edit HTML'}
                      </button>
                    </div>
                  </div>

                  {/* HTML Editor (hidden by default) */}
                  {showHtmlEditor && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[var(--gray-600)]">HTML Editor (Advanced)</label>
                        <div className="relative">
                          <button
                            onClick={() => setShowPlaceholderPicker(!showPlaceholderPicker)}
                            className="text-xs text-[var(--primary-600)] hover:text-[var(--primary-700)] flex items-center gap-1"
                          >
                            Insert Placeholder
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {showPlaceholderPicker && (
                            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-[var(--gray-200)] rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                              {Object.entries(placeholdersByCategory).map(([category, placeholders]) => (
                                <div key={category}>
                                  <div className="px-3 py-1.5 bg-[var(--gray-50)] text-xs font-medium text-[var(--gray-600)] sticky top-0">
                                    {category}
                                  </div>
                                  {placeholders.map(({ key, label }) => (
                                    <button
                                      key={key}
                                      onClick={() => insertPlaceholder(key)}
                                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-[var(--gray-50)] flex items-center justify-between"
                                    >
                                      <span>{label}</span>
                                      <span className="text-xs text-[var(--gray-400)]">{`{{${key}}}`}</span>
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <textarea
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        className="w-full h-[300px] px-3 py-2 font-mono text-xs border border-[var(--gray-300)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)] bg-[var(--gray-50)]"
                      />

                      {/* AI Clauses Documentation */}
                      <div className="mt-3 p-3 bg-[var(--primary-50)] border border-[var(--primary-200)] rounded-lg">
                        <h4 className="text-xs font-semibold text-[var(--primary-800)] mb-1">AI-Generated Clauses</h4>
                        <p className="text-xs text-[var(--primary-700)] mb-2">
                          Use <code className="bg-[var(--primary-100)] px-1 rounded">{'{{ai_clauses}}'}</code> to mark where AI-generated clauses should appear.
                        </p>
                        <ul className="text-xs text-[var(--primary-700)] space-y-1 ml-3 list-disc">
                          <li>Clauses will be auto-numbered based on their position in the document</li>
                          <li>Place this placeholder after the section where you want clauses to appear</li>
                          <li>Users can generate and customize clauses when creating contracts</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Preview Info */}
                  <div className="bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Eye className="h-5 w-5 text-[var(--gray-400)] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--gray-700)]">Preview your template</p>
                        <p className="text-xs text-[var(--gray-500)] mt-1">
                          After saving, click "Preview" on the template card to see the full PDF with page breaks, initials, and signature page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--gray-200)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
          </button>
        </div>
      </div>

    </div>
  )
}

// Starter HTML template
function getStarterHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.5;
      padding: 0.5in;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      margin-bottom: 20pt;
    }
    .section {
      margin-bottom: 15pt;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 5pt;
    }
  </style>
</head>
<body>
  <h1>CONTRACT TITLE</h1>

  <div class="section">
    <p>This Agreement is entered into as of <strong>{{contract_date}}</strong></p>
  </div>

  <div class="section">
    <div class="section-title">1. PARTIES</div>
    <p><strong>SELLER:</strong> {{seller_name}}</p>
    <p>Email: {{seller_email}}</p>
    <br/>
    <p><strong>BUYER:</strong> {{company_name}}</p>
    <p>Email: {{company_email}}</p>
  </div>

  <div class="section">
    <div class="section-title">2. PROPERTY</div>
    <p>{{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
  </div>

  <div class="section">
    <div class="section-title">3. PURCHASE PRICE</div>
    <p>The total purchase price is \${{purchase_price}}</p>
  </div>

  <!-- Add more sections as needed -->

</body>
</html>`
}

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  contract_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  seller_name: 'John Smith',
  seller_email: 'john.smith@email.com',
  seller_phone: '(555) 123-4567',
  seller_address: '123 Main St, Anytown, FL 12345',
  company_name: 'ABC Investments LLC',
  company_email: 'contact@abcinvestments.com',
  company_phone: '(555) 987-6543',
  company_address: '456 Business Ave',
  company_signer_name: 'Jane Doe',
  property_address: '789 Oak Lane',
  property_city: 'Springfield',
  property_state: 'FL',
  property_zip: '32801',
  full_property_address: '789 Oak Lane, Springfield, FL 32801',
  apn: '12-34-56-7890-00-001',
  purchase_price: '250,000',
  earnest_money: '5,000',
  assignment_fee: '15,000',
  close_of_escrow: 'January 30, 2025',
  inspection_period: '10',
  escrow_agent_name: 'First Title Company',
  escrow_agent_address: '100 Title Way, Orlando, FL 32801',
  escrow_officer: 'Sarah Johnson',
  escrow_agent_email: 'sarah@firsttitle.com',
  personal_property: 'Washer, Dryer, Refrigerator',
  additional_terms: 'Property sold as-is. Seller to provide clear title at closing.',
  assignee_name: 'Mike Wilson',
  assignee_email: 'mike.wilson@email.com',
  assignee_phone: '(555) 456-7890',
  assignee_address: '321 Buyer Blvd, Miami, FL 33101',
  ai_clauses: '<p><strong>12.6</strong> <em>AS-IS Condition:</em> Buyer accepts property in as-is condition.</p>',
}

// Replace placeholders with sample data
function fillPlaceholders(html: string): string {
  let result = html

  // First, handle conditional blocks BEFORE replacing placeholders
  // Remove {{#if ai_clauses}}...{{/if}} blocks since ai_clauses is empty in preview
  result = result.replace(/\{\{#if ai_clauses\}\}[\s\S]*?\{\{\/if\}\}/g, '')

  // Handle other conditional blocks - remove the conditional syntax but keep content
  result = result.replace(/\{\{#if [^}]+\}\}/g, '')
  result = result.replace(/\{\{\/if\}\}/g, '')

  // Replace placeholders with sample data
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(regex, value)
  }

  // Remove any unfilled placeholders (show as blank, not highlighted)
  result = result.replace(/\{\{[^}]+\}\}/g, '')

  return result
}

// Template Preview Component - Shows paginated view like actual PDF
function TemplatePreview({
  template,
  onClose,
  onEdit,
  onCopy,
  onUse,
}: {
  template: CompanyTemplate
  onClose: () => void
  onEdit: () => void
  onCopy: () => void
  onUse: () => void
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const filledHtml = fillPlaceholders(template.html_content)

  // Generate signature page HTML based on layout - matches actual PDF templates
  const getSignaturePageHtml = () => {
    const layout = template.signature_layout || 'two-column'

    if (layout === 'two-column') {
      return `
        <div class="signature-page">
          <p class="signature-header">
            Seller acknowledges and agrees that Seller has read and fully understands the terms and conditions of this Contract and is entering into this Contract voluntarily and has not been threatened, coerced, or intimidated into signing this Contract.
          </p>
          <div class="signature-columns">
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY SELLER ON:</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">SELLER SIGNATURE:</div>
                <div class="signature-box"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">MAILING ADDRESS:</div>
                <div class="signature-line">123 Main St, City, ST 12345</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">seller@example.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 123-4567</div>
              </div>
            </div>
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY BUYER ON:</div>
                <div class="signature-line">January 15, 2025</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">BUYER SIGNATURE:</div>
                <div class="signature-box" style="display: flex; align-items: center; justify-content: center; padding: 2px; font-style: italic; color: #666;">[Pre-signed]</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">COMPANY NAME:</div>
                <div class="signature-line">Acme Investments LLC</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">BUYER SIGNER NAME:</div>
                <div class="signature-line">John Smith</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">buyer@company.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 987-6543</div>
              </div>
            </div>
          </div>
        </div>
      `
    } else if (layout === 'two-column-assignment') {
      return `
        <div class="signature-page">
          <p class="signature-header">
            Assignee acknowledges and agrees that Assignee has read and fully understands the terms and conditions of this Contract and is entering into this Contract voluntarily and has not been threatened, coerced, or intimidated into signing this Contract.
          </p>
          <div class="signature-columns">
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY ASSIGNEE ON:</div>
                <div class="signature-line"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">ASSIGNEE SIGNATURE:</div>
                <div class="signature-box"></div>
              </div>
              <div class="signature-row">
                <div class="signature-label">MAILING ADDRESS:</div>
                <div class="signature-line">123 Main St, City, ST 12345</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">assignee@example.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 123-4567</div>
              </div>
            </div>
            <div class="signature-column">
              <div class="signature-row">
                <div class="signature-label">APPROVED AND ACCEPTED BY ASSIGNOR ON:</div>
                <div class="signature-line">January 15, 2025</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">ASSIGNOR SIGNATURE:</div>
                <div class="signature-box" style="display: flex; align-items: center; justify-content: center; padding: 2px; font-style: italic; color: #666;">[Pre-signed]</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">COMPANY NAME:</div>
                <div class="signature-line">Acme Investments LLC</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">ASSIGNOR SIGNER NAME:</div>
                <div class="signature-line">John Smith</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">EMAIL:</div>
                <div class="signature-line">assignor@company.com</div>
              </div>
              <div class="signature-row">
                <div class="signature-label">PHONE:</div>
                <div class="signature-line">(555) 987-6543</div>
              </div>
            </div>
          </div>
        </div>
      `
    } else if (layout === 'seller-only') {
      return `
        <div class="signature-page">
          <p class="signature-header">
            Seller acknowledges and agrees that Seller has read and fully understands the terms and conditions of this Contract and is entering into this Contract voluntarily and has not been threatened, coerced, or intimidated into signing this Contract.
          </p>
          <div style="max-width: 50%; margin: 0 auto;">
            <div class="signature-row">
              <div class="signature-label">APPROVED AND ACCEPTED BY SELLER ON:</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-row">
              <div class="signature-label">SELLER SIGNATURE:</div>
              <div class="signature-box"></div>
            </div>
            <div class="signature-row">
              <div class="signature-label">PRINTED NAME:</div>
              <div class="signature-line">John Doe</div>
            </div>
            <div class="signature-row">
              <div class="signature-label">MAILING ADDRESS:</div>
              <div class="signature-line">123 Main St, City, ST 12345</div>
            </div>
            <div class="signature-row">
              <div class="signature-label">EMAIL:</div>
              <div class="signature-line">seller@example.com</div>
            </div>
            <div class="signature-row">
              <div class="signature-label">PHONE:</div>
              <div class="signature-line">(555) 123-4567</div>
            </div>
          </div>
          <div style="margin-top: 40pt; padding-top: 20pt; border-top: 1px solid #ccc;">
            <p style="text-align: center; font-size: 10pt; color: #666;">
              Buyer has pre-signed this agreement. Contract date: January 15, 2025
            </p>
          </div>
        </div>
      `
    } else {
      // three-party - compact layout to fit on single page
      return `
        <div class="signature-page">
          <p style="text-align: center; font-size: 9pt; margin-bottom: 12pt; line-height: 1.3;">
            All parties acknowledge and agree that they have read and fully understand the terms and conditions of this Assignment Contract and are entering into this Contract voluntarily.
          </p>
          <div style="margin-bottom: 12pt;">
            <div style="font-size: 10pt; font-weight: bold; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 3pt;">ORIGINAL SELLER</div>
            <div class="signature-columns">
              <div class="signature-column">
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">SELLER SIGNATURE:</div>
                  <div class="signature-box" style="min-height: 30pt;"></div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">PRINTED NAME:</div>
                  <div class="signature-line">John Doe</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">DATE:</div>
                  <div class="signature-line"></div>
                </div>
              </div>
              <div class="signature-column">
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">EMAIL:</div>
                  <div class="signature-line">seller@example.com</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">PHONE:</div>
                  <div class="signature-line">(555) 123-4567</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">ADDRESS:</div>
                  <div class="signature-line">123 Main St, City, ST 12345</div>
                </div>
              </div>
            </div>
          </div>
          <div style="margin-bottom: 12pt;">
            <div style="font-size: 10pt; font-weight: bold; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 3pt;">ASSIGNOR (WHOLESALER)</div>
            <div class="signature-columns">
              <div class="signature-column">
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">ASSIGNOR SIGNATURE:</div>
                  <div class="signature-box" style="display: flex; align-items: center; justify-content: center; font-style: italic; color: #666; min-height: 30pt;">[Pre-signed]</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">COMPANY NAME:</div>
                  <div class="signature-line">Acme Investments LLC</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">SIGNER NAME:</div>
                  <div class="signature-line">John Smith</div>
                </div>
              </div>
              <div class="signature-column">
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">DATE:</div>
                  <div class="signature-line">January 15, 2025</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">EMAIL:</div>
                  <div class="signature-line">buyer@company.com</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">PHONE:</div>
                  <div class="signature-line">(555) 987-6543</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div style="font-size: 10pt; font-weight: bold; margin-bottom: 6pt; border-bottom: 1px solid #000; padding-bottom: 3pt;">ASSIGNEE (END BUYER)</div>
            <div class="signature-columns">
              <div class="signature-column">
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">ASSIGNEE SIGNATURE:</div>
                  <div class="signature-box" style="min-height: 30pt;"></div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">PRINTED NAME:</div>
                  <div class="signature-line">Jane Wilson</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">DATE:</div>
                  <div class="signature-line"></div>
                </div>
              </div>
              <div class="signature-column">
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">EMAIL:</div>
                  <div class="signature-line">assignee@example.com</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">PHONE:</div>
                  <div class="signature-line">(555) 555-5555</div>
                </div>
                <div style="margin-bottom: 8pt;">
                  <div class="signature-label">ADDRESS:</div>
                  <div class="signature-line">456 Oak Ave, Town, ST 67890</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `
    }
  }

  // Generate the content HTML with auto-pagination like a real PDF
  const generatePreviewHtml = () => {
    // Extract style content
    const styleMatch = filledHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
    const styles = styleMatch ? styleMatch[1] : ''

    // Extract body content
    const bodyMatch = filledHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    let bodyContent = bodyMatch ? bodyMatch[1] : filledHtml

    // Check if template already has a signature page
    const hasSignaturePage = bodyContent.includes('class="signature-page"')

    // If no signature page exists, add the "signatures on next page" notice and generate one
    if (!hasSignaturePage) {
      bodyContent += `
        <p class="center-text" style="text-align: center; font-weight: bold; margin-top: 30pt; padding-top: 15pt; border-top: 1px solid #ccc;">
          [SIGNATURES ON THE FOLLOWING PAGE]
        </p>
        ${getSignaturePageHtml()}
      `
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          ${styles}

          /* Signature page styles - matches PDF generator exactly */
          .signature-page {
            page-break-before: always;
          }

          .signature-header {
            text-align: center;
            font-style: italic;
            margin-bottom: 30pt;
            line-height: 1.4;
          }

          .signature-columns {
            display: flex;
            justify-content: space-between;
          }

          .signature-column {
            width: 45%;
          }

          .signature-row {
            margin-bottom: 16pt;
          }

          .signature-label {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4pt;
          }

          .signature-line {
            border-bottom: 1px solid #000;
            min-height: 20pt;
            padding-top: 2pt;
          }

          .signature-box {
            border: 1px solid #000;
            min-height: 35pt;
          }

          /* Preview container styles */
          html, body {
            margin: 0;
            padding: 0;
            background: #e5e7eb;
          }

          #content-measurer {
            position: absolute;
            left: -9999px;
            top: 0;
            width: 6.5in;
            padding: 0;
          }

          #pages-container {
            padding: 20px 0;
          }

          /* Each page styled as a paper sheet */
          .preview-page {
            background: white;
            width: 8.5in;
            height: 11in;
            margin: 0 auto 30px auto;
            padding: 0.75in 1in;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }

          .preview-page:first-child {
            margin-top: 0;
          }

          .page-content {
            height: calc(11in - 1.5in - 50px);
            overflow: hidden;
          }

          /* Page footer with initials */
          .page-footer {
            position: absolute;
            bottom: 0.5in;
            left: 1in;
            right: 1in;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9pt;
            color: #4b5563;
            font-family: 'Times New Roman', Times, serif;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
          }

          .initials-label {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .initials-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 20px;
            border: 1px solid #000;
            background: white;
            font-size: 8pt;
          }

          .buyer-initials {
            font-family: 'Brush Script MT', cursive;
            font-size: 11pt;
            color: #000;
          }

          .page-number {
            font-size: 9pt;
          }

          /* Signature page footer - no initials needed */
          .signature-page-footer {
            position: absolute;
            bottom: 0.5in;
            left: 1in;
            right: 1in;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 9pt;
            color: #4b5563;
            font-family: 'Times New Roman', Times, serif;
            padding-top: 8px;
            border-top: 1px solid #d1d5db;
          }
        </style>
      </head>
      <body>
        <!-- Hidden content measurer -->
        <div id="content-measurer">${bodyContent}</div>

        <!-- Pages will be generated here -->
        <div id="pages-container"></div>

        <script>
          (function() {
            // Page dimensions in pixels (96 DPI)
            // Letter: 8.5" x 11", with 0.75" padding top/bottom = 9.5" content area
            // Subtract ~45px for footer
            const USABLE_HEIGHT = (9.5 * 96) - 45; // ~867px

            const measurer = document.getElementById('content-measurer');
            const container = document.getElementById('pages-container');

            // Flatten elements - get all leaf/small elements for better pagination
            function flattenElements(parent) {
              const result = [];
              const children = Array.from(parent.children);

              children.forEach(el => {
                // Skip signature page - handle separately
                if (el.classList.contains('signature-page')) {
                  return;
                }

                const rect = el.getBoundingClientRect();
                const hasBlockChildren = Array.from(el.children).some(child => {
                  const display = window.getComputedStyle(child).display;
                  return display === 'block' || display === 'flex' || display === 'grid';
                });

                // If element is tall and has block children, recurse into it
                if (rect.height > USABLE_HEIGHT * 0.4 && hasBlockChildren && el.children.length > 1) {
                  // Add the element's own content wrapper if needed
                  const wrapper = el.cloneNode(false);
                  wrapper.innerHTML = '';
                  result.push({ type: 'wrapper-start', el: wrapper, tag: el.tagName });

                  flattenElements(el).forEach(item => result.push(item));

                  result.push({ type: 'wrapper-end', tag: el.tagName });
                } else {
                  result.push({ type: 'element', el: el });
                }
              });

              return result;
            }

            // Get signature page separately
            let signatureElement = measurer.querySelector('.signature-page');
            if (signatureElement) {
              signatureElement = signatureElement.cloneNode(true);
            }

            // Get flattened elements
            const flatItems = flattenElements(measurer);

            // Create pages
            let pages = [];
            let currentPageHtml = '';
            let currentHeight = 0;
            let wrapperStack = [];

            // Helper to get opening tag from element
            function getOpeningTag(el) {
              const tag = el.tagName.toLowerCase();
              let attrs = '';
              for (let i = 0; i < el.attributes.length; i++) {
                const attr = el.attributes[i];
                attrs += ' ' + attr.name + '="' + attr.value + '"';
              }
              return '<' + tag + attrs + '>';
            }

            flatItems.forEach((item) => {
              if (item.type === 'wrapper-start') {
                const openTag = getOpeningTag(item.el);
                wrapperStack.push(openTag);
                currentPageHtml += openTag;
              } else if (item.type === 'wrapper-end') {
                wrapperStack.pop();
                currentPageHtml += '</' + item.tag.toLowerCase() + '>';
              } else {
                const el = item.el;
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                const marginTop = parseFloat(styles.marginTop) || 0;
                const marginBottom = parseFloat(styles.marginBottom) || 0;
                const totalHeight = rect.height + marginTop + marginBottom;

                // Check if this element would overflow
                if (currentHeight + totalHeight > USABLE_HEIGHT && currentPageHtml.trim()) {
                  // Close any open wrappers
                  let closeTags = '';
                  for (let i = wrapperStack.length - 1; i >= 0; i--) {
                    const match = wrapperStack[i].match(/<(\\w+)/);
                    if (match) closeTags += '</' + match[1] + '>';
                  }
                  pages.push(currentPageHtml + closeTags);

                  // Start new page with wrapper reopeners
                  currentPageHtml = wrapperStack.join('') + el.outerHTML;
                  currentHeight = totalHeight;
                } else {
                  currentPageHtml += el.outerHTML;
                  currentHeight += totalHeight;
                }
              }
            });

            // Close remaining wrappers and add last page
            if (currentPageHtml.trim()) {
              let closeTags = '';
              for (let i = wrapperStack.length - 1; i >= 0; i--) {
                const tag = wrapperStack[i].match(/<(\\w+)/)?.[1];
                if (tag) closeTags += '</' + tag + '>';
              }
              pages.push(currentPageHtml + closeTags);
            }

            const totalContentPages = pages.length;
            const totalPages = totalContentPages + (signatureElement ? 1 : 0);

            // Render content pages
            pages.forEach((pageHtml, pageIndex) => {
              const pageNum = pageIndex + 1;

              const pageDiv = document.createElement('div');
              pageDiv.className = 'preview-page';

              const contentDiv = document.createElement('div');
              contentDiv.className = 'page-content';
              contentDiv.innerHTML = pageHtml;

              pageDiv.appendChild(contentDiv);

              // Add footer with initials
              pageDiv.innerHTML += \`
                <div class="page-footer">
                  <div class="initials-label">
                    Seller Initials: <span class="initials-box">______</span>
                  </div>
                  <span class="page-number">Page \${pageNum} of \${totalPages}</span>
                  <div class="initials-label">
                    Buyer Initials: <span class="initials-box buyer-initials">JD</span>
                  </div>
                </div>
              \`;

              container.appendChild(pageDiv);
            });

            // Add signature page
            if (signatureElement) {
              const pageDiv = document.createElement('div');
              pageDiv.className = 'preview-page';

              const contentDiv = document.createElement('div');
              contentDiv.className = 'page-content';
              contentDiv.appendChild(signatureElement);

              pageDiv.appendChild(contentDiv);

              pageDiv.innerHTML += \`
                <div class="signature-page-footer">
                  <span class="page-number">Page \${totalPages} of \${totalPages}</span>
                </div>
              \`;

              container.appendChild(pageDiv);
            }

            // Hide the measurer
            measurer.style.display = 'none';
          })();
        </script>
      </body>
      </html>
    `
  }

  // Write to iframe
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (doc) {
        doc.open()
        doc.write(generatePreviewHtml())
        doc.close()
      }
    }
  }, [filledHtml])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--gray-200)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gray-900)]">
              {template.name}
              {template.is_example && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-[var(--primary-100)] text-[var(--primary-700)] rounded-full">
                  Example
                </span>
              )}
            </h2>
            <p className="text-sm text-[var(--gray-500)]">
              Preview with sample data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--gray-100)] rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Content - Full scrollable contract with page separations */}
        <div className="flex-1 overflow-auto p-6 bg-[var(--gray-100)]">
          <div
            className="mx-auto"
            style={{
              width: '8.5in',
              maxWidth: '100%',
            }}
          >
            <iframe
              ref={iframeRef}
              title="Template Preview"
              className="w-full border-0 bg-white shadow-lg"
              style={{
                minHeight: '1400px',
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--gray-200)]">
          <div className="text-sm text-[var(--gray-500)]">
            Signature Layout: <span className="font-medium">
              {template.signature_layout === 'two-column' ? 'Two Column Purchase (Seller + Buyer)' :
               template.signature_layout === 'two-column-assignment' ? 'Two Column Assignment (Assignee + Assignor)' :
               template.signature_layout === 'seller-only' ? 'Seller Only' :
               template.signature_layout === 'three-party' ? 'Three Party (Assignment)' : template.signature_layout}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCopy}
              className="px-4 py-2 text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded-lg flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Template
            </button>
            {!template.is_example && (
              <button
                onClick={onEdit}
                className="px-4 py-2 text-[var(--gray-700)] hover:bg-[var(--gray-100)] rounded-lg flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={onUse}
              className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg hover:bg-[var(--primary-700)] flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Use Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
