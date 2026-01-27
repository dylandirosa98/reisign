'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Loader2,
  Home,
  User,
  DollarSign,
  AlertCircle,
  Save,
  FileText,
  ChevronDown,
} from 'lucide-react'
import {
  CompanyTemplate,
  CustomField,
  StandardFieldKey,
  DEFAULT_FIELD_CONFIG,
} from '@/types/database'

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

interface FormData {
  // Property
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  apn: string
  // Seller
  seller_name: string
  seller_email: string
  seller_phone: string
  seller_address: string
  // End Buyer (for Assignment)
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  // Pricing
  price: string
  earnest_money: string
  assignment_fee: string
  // Escrow
  escrow_agent_name: string
  escrow_agent_address: string
  escrow_officer: string
  escrow_agent_email: string
  // Terms
  close_of_escrow: string
  inspection_period: string
  personal_property: string
  additional_terms: string
  // Section 1.10
  escrow_fees_split: string
  title_policy_paid_by: string
  hoa_fees_split: string
  // Buyer signature page
  company_name: string
  company_signer_name: string
  company_email: string
  company_phone: string
  buyer_signature: string
  buyer_initials: string
}

// Format number with commas (e.g., 250000 -> 250,000)
const formatCurrency = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  // Add commas
  return parseInt(digits, 10).toLocaleString('en-US')
}

// Format phone number (e.g., 5551234567 -> (555) 123-4567)
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''

  // Format based on length
  if (digits.length <= 3) {
    return `(${digits}`
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }
}

const initialFormData: FormData = {
  property_address: '',
  property_city: '',
  property_state: '',
  property_zip: '',
  apn: '',
  seller_name: '',
  seller_email: '',
  seller_phone: '',
  seller_address: '',
  buyer_name: '',
  buyer_email: '',
  buyer_phone: '',
  price: '',
  earnest_money: '',
  assignment_fee: '',
  escrow_agent_name: '',
  escrow_agent_address: '',
  escrow_officer: '',
  escrow_agent_email: '',
  close_of_escrow: '',
  inspection_period: '',
  personal_property: '',
  additional_terms: '',
  escrow_fees_split: '',
  title_policy_paid_by: '',
  hoa_fees_split: '',
  company_name: '',
  company_signer_name: '',
  company_email: '',
  company_phone: '',
  buyer_signature: '',
  buyer_initials: '',
}

export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get('templateId')

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<CompanyTemplate | null>(null)
  const [availableTemplates, setAvailableTemplates] = useState<CompanyTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/company-templates')
        const data = await res.json()
        if (data.templates) {
          setAvailableTemplates(data.templates)
          // If templateId is in URL, select that template
          if (templateId) {
            const template = data.templates.find((t: CompanyTemplate) => t.id === templateId)
            if (template) {
              setSelectedTemplate(template)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err)
      } finally {
        setLoadingTemplates(false)
      }
    }
    fetchTemplates()
  }, [templateId])

  // Get field configuration from template or use defaults
  const getFieldConfig = (fieldKey: StandardFieldKey) => {
    if (!selectedTemplate) {
      // No template selected - use defaults (all visible)
      return DEFAULT_FIELD_CONFIG.standardFields[fieldKey] || { visible: true, required: false }
    }
    // Check template's field_config, fallback to default
    const templateConfig = selectedTemplate.field_config?.standardFields?.[fieldKey]
    if (templateConfig) {
      return templateConfig
    }
    // If template has field_config but this field isn't specified, check if placeholder is used
    // This provides backwards compatibility with templates that don't have explicit field_config
    if (selectedTemplate.field_config) {
      return DEFAULT_FIELD_CONFIG.standardFields[fieldKey] || { visible: true, required: false }
    }
    // Legacy behavior: check if placeholder is used
    const isUsed = selectedTemplate.used_placeholders?.includes(fieldKey) ?? true
    return { visible: isUsed, required: false }
  }

  // Core required fields that are ALWAYS visible (needed for contract creation API)
  const ALWAYS_VISIBLE_FIELDS: StandardFieldKey[] = [
    'property_address', 'property_city', 'property_state', 'property_zip',
    'seller_name', 'seller_email', 'purchase_price',
  ]

  // Check if a field should be visible
  const isFieldVisible = (fieldKey: StandardFieldKey): boolean => {
    // Core required fields are always visible regardless of template config
    if (ALWAYS_VISIBLE_FIELDS.includes(fieldKey)) {
      return true
    }
    return getFieldConfig(fieldKey).visible
  }

  // Check if a field is required
  const isFieldRequired = (fieldKey: StandardFieldKey): boolean => {
    const config = getFieldConfig(fieldKey)
    return config.visible && config.required
  }

  // Check if any field in a group is visible
  const isGroupVisible = (fieldKeys: StandardFieldKey[]): boolean => {
    return fieldKeys.some(key => isFieldVisible(key))
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string | null => {
    // Property fields
    if (isFieldRequired('property_address') && !formData.property_address.trim()) {
      return 'Property address is required'
    }
    if (isFieldRequired('property_city') && !formData.property_city.trim()) {
      return 'Property city is required'
    }
    if (isFieldRequired('property_state') && !formData.property_state) {
      return 'Property state is required'
    }
    if (isFieldRequired('property_zip') && !formData.property_zip.trim()) {
      return 'Property ZIP code is required'
    }
    // Seller fields
    if (isFieldRequired('seller_name') && !formData.seller_name.trim()) {
      return 'Seller name is required'
    }
    if (isFieldRequired('seller_email') && !formData.seller_email.trim()) {
      return 'Seller email is required'
    }
    if (formData.seller_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.seller_email)) {
      return 'Invalid seller email format'
    }
    // Financial fields
    if (isFieldRequired('purchase_price') && !formData.price.trim()) {
      return 'Purchase price is required'
    }
    if (formData.price && isNaN(parseFloat(formData.price.replace(/[,$]/g, '')))) {
      return 'Invalid purchase price format'
    }
    // Buyer fields
    if (isFieldRequired('buyer_email') && formData.buyer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyer_email)) {
      return 'Invalid buyer email format'
    }
    return null
  }

  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate?.id,
          property: {
            address: formData.property_address,
            city: formData.property_city,
            state: formData.property_state,
            zip: formData.property_zip,
          },
          seller: {
            name: formData.seller_name,
            email: formData.seller_email,
            phone: formData.seller_phone,
          },
          buyer: {
            name: formData.buyer_name,
            email: formData.buyer_email,
            phone: formData.buyer_phone,
          },
          contract: {
            purchasePrice: parseFloat(formData.price.replace(/[,$]/g, '') || '0'),
            assignmentFee: formData.assignment_fee
              ? parseFloat(formData.assignment_fee.replace(/[,$]/g, ''))
              : 0,
          },
          customFields: {
            property_address: formData.property_address,
            property_city: formData.property_city,
            property_state: formData.property_state,
            property_zip: formData.property_zip,
            apn: formData.apn,
            seller_phone: formData.seller_phone,
            seller_address: formData.seller_address,
            buyer_phone: formData.buyer_phone,
            earnest_money: formData.earnest_money ? parseFloat(formData.earnest_money.replace(/[,$]/g, '')) : undefined,
            assignment_fee: formData.assignment_fee ? parseFloat(formData.assignment_fee.replace(/[,$]/g, '')) : undefined,
            escrow_agent_name: formData.escrow_agent_name,
            escrow_agent_address: formData.escrow_agent_address,
            escrow_officer: formData.escrow_officer,
            escrow_agent_email: formData.escrow_agent_email,
            close_of_escrow: formData.close_of_escrow,
            inspection_period: formData.inspection_period,
            personal_property: formData.personal_property,
            additional_terms: formData.additional_terms,
            escrow_fees_split: formData.escrow_fees_split || undefined,
            title_policy_paid_by: formData.title_policy_paid_by || undefined,
            hoa_fees_split: formData.hoa_fees_split || undefined,
            company_name: formData.company_name,
            company_signer_name: formData.company_signer_name,
            company_email: formData.company_email,
            company_phone: formData.company_phone,
            buyer_signature: formData.buyer_signature,
            buyer_initials: formData.buyer_initials,
            // Include custom field values from template
            ...customFieldValues,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create contract')
      }

      const data = await response.json()
      router.push(`/dashboard/contracts/${data.contract.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/contracts"
          className="inline-flex items-center text-sm text-[var(--gray-600)] hover:text-[var(--gray-900)] mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Contracts
        </Link>
        <h1 className="text-2xl font-bold text-[var(--gray-900)]">Create New Contract</h1>
        <p className="text-sm text-[var(--gray-600)]">
          Fill in the contract details. Fields marked with * are required to create the contract.
        </p>
      </div>

      {/* Template Selector */}
      <div className="mb-6 bg-white border border-[var(--gray-200)] rounded p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary-50)] rounded-lg">
              <FileText className="h-5 w-5 text-[var(--primary-600)]" />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--gray-900)]">Template</label>
              {selectedTemplate ? (
                <p className="text-sm text-[var(--gray-600)]">
                  Using: <span className="font-medium">{selectedTemplate.name}</span>
                </p>
              ) : (
                <p className="text-sm text-[var(--gray-500)]">No template selected - all fields shown</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              className="px-3 py-2 text-sm border border-[var(--gray-300)] rounded-lg hover:bg-[var(--gray-50)] flex items-center gap-2"
            >
              {loadingTemplates ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {selectedTemplate ? 'Change Template' : 'Select Template'}
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
            {showTemplateSelector && !loadingTemplates && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-[var(--gray-200)] rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(null)
                    setShowTemplateSelector(false)
                    setCustomFieldValues({})
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--gray-50)] flex items-center justify-between ${
                    !selectedTemplate ? 'bg-[var(--primary-50)]' : ''
                  }`}
                >
                  <span>No template (show all fields)</span>
                </button>
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowTemplateSelector(false)
                      setCustomFieldValues({})
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--gray-50)] ${
                      selectedTemplate?.id === template.id ? 'bg-[var(--primary-50)]' : ''
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-[var(--gray-500)] truncate">{template.description}</div>
                    )}
                  </button>
                ))}
                {availableTemplates.length === 0 && (
                  <div className="px-3 py-2 text-sm text-[var(--gray-500)]">
                    No templates available.{' '}
                    <Link href="/dashboard/templates" className="text-[var(--primary-600)] hover:underline">
                      Create one
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-[var(--error-100)] border border-[var(--error-700)] rounded">
          <div className="flex items-center gap-2 text-[var(--error-700)]">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Form - Show for all cases (template optional) */}
      {loadingTemplates && templateId ? (
        <div className="bg-white border border-[var(--gray-200)] rounded p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-600)] mx-auto mb-3" />
          <p className="text-sm text-[var(--gray-600)]">Loading template...</p>
        </div>
      ) : (
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="font-semibold text-[var(--gray-900)]">Contract Details</h2>
        </div>
        <div className="p-4">
          <div className="space-y-6">
            {/* Property Section */}
            {isGroupVisible(['property_address', 'property_city', 'property_state', 'property_zip', 'apn']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                  <Home className="w-4 h-4 text-[var(--gray-400)]" />
                  Property
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {isFieldVisible('property_address') && (
                    <div className="col-span-2">
                      <Label className="text-xs text-[var(--gray-600)]">
                        Address {isFieldRequired('property_address') && '*'}
                      </Label>
                      <Input
                        value={formData.property_address}
                        onChange={(e) => updateField('property_address', e.target.value)}
                        placeholder="123 Main St"
                      />
                    </div>
                  )}
                  {isFieldVisible('property_city') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        City {isFieldRequired('property_city') && '*'}
                      </Label>
                      <Input
                        value={formData.property_city}
                        onChange={(e) => updateField('property_city', e.target.value)}
                        placeholder="City"
                      />
                    </div>
                  )}
                  {(isFieldVisible('property_state') || isFieldVisible('property_zip')) && (
                    <div className="grid grid-cols-2 gap-2">
                      {isFieldVisible('property_state') && (
                        <div>
                          <Label className="text-xs text-[var(--gray-600)]">
                            State {isFieldRequired('property_state') && '*'}
                          </Label>
                          <select
                            value={formData.property_state}
                            onChange={(e) => updateField('property_state', e.target.value)}
                            className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm"
                          >
                            <option value="">Select</option>
                            {US_STATES.map((state) => (
                              <option key={state.code} value={state.code}>
                                {state.code}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {isFieldVisible('property_zip') && (
                        <div>
                          <Label className="text-xs text-[var(--gray-600)]">
                            ZIP {isFieldRequired('property_zip') && '*'}
                          </Label>
                          <Input
                            value={formData.property_zip}
                            onChange={(e) => updateField('property_zip', e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {isFieldVisible('apn') && (
                    <div className="col-span-2">
                      <Label className="text-xs text-[var(--gray-600)]">
                        APN/Parcel Number {isFieldRequired('apn') && '*'}
                      </Label>
                      <Input
                        value={formData.apn}
                        onChange={(e) => updateField('apn', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Seller Section */}
            {isGroupVisible(['seller_name', 'seller_email', 'seller_phone', 'seller_address']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--gray-400)]" />
                  Seller (Property Owner)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {isFieldVisible('seller_name') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Name {isFieldRequired('seller_name') && '*'}
                      </Label>
                      <Input
                        value={formData.seller_name}
                        onChange={(e) => updateField('seller_name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                  )}
                  {isFieldVisible('seller_email') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Email {isFieldRequired('seller_email') && '*'}
                      </Label>
                      <Input
                        type="email"
                        value={formData.seller_email}
                        onChange={(e) => updateField('seller_email', e.target.value)}
                        placeholder="seller@email.com"
                      />
                      <p className="text-xs text-[var(--primary-600)] mt-1">
                        Signing document will be sent here via Documenso
                        {selectedTemplate?.signature_layout === 'three-party' ? ' (Signs 1st)' : ''}
                      </p>
                    </div>
                  )}
                  {isFieldVisible('seller_phone') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Phone {isFieldRequired('seller_phone') && '*'}
                      </Label>
                      <Input
                        value={formData.seller_phone}
                        onChange={(e) => updateField('seller_phone', formatPhoneNumber(e.target.value))}
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>
                  )}
                  {isFieldVisible('seller_address') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Address {isFieldRequired('seller_address') && '*'}
                      </Label>
                      <Input
                        value={formData.seller_address}
                        onChange={(e) => updateField('seller_address', e.target.value)}
                        placeholder="Seller's mailing address"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* End Buyer/Assignee Section */}
            {isGroupVisible(['buyer_name', 'buyer_email', 'buyer_phone']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--gray-400)]" />
                  {selectedTemplate?.signature_layout === 'three-party' ? 'Assignee (End Buyer)' : 'End Buyer (for Assignment)'}
                </h3>
                <p className="text-xs text-[var(--gray-500)] mb-3">
                  {selectedTemplate?.signature_layout === 'three-party'
                    ? 'Required for three-party assignment contracts'
                    : 'Optional - only needed if assigning the contract'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {isFieldVisible('buyer_name') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Name {isFieldRequired('buyer_name') && '*'}
                      </Label>
                      <Input
                        value={formData.buyer_name}
                        onChange={(e) => updateField('buyer_name', e.target.value)}
                        placeholder="End buyer name"
                      />
                    </div>
                  )}
                  {isFieldVisible('buyer_email') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Email {isFieldRequired('buyer_email') && '*'}
                      </Label>
                      <Input
                        type="email"
                        value={formData.buyer_email}
                        onChange={(e) => updateField('buyer_email', e.target.value)}
                        placeholder="buyer@email.com"
                      />
                      {selectedTemplate?.signature_layout === 'three-party' && (
                        <p className="text-xs text-[var(--primary-600)] mt-1">
                          Signing document will be sent here via Documenso (Signs 2nd, after Seller)
                        </p>
                      )}
                    </div>
                  )}
                  {isFieldVisible('buyer_phone') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Phone {isFieldRequired('buyer_phone') && '*'}
                      </Label>
                      <Input
                        value={formData.buyer_phone}
                        onChange={(e) => updateField('buyer_phone', formatPhoneNumber(e.target.value))}
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Section */}
            {isGroupVisible(['purchase_price', 'earnest_money', 'assignment_fee']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[var(--gray-400)]" />
                  Pricing
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {isFieldVisible('purchase_price') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Purchase Price {isFieldRequired('purchase_price') && '*'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)]">$</span>
                        <Input
                          type="text"
                          value={formData.price}
                          onChange={(e) => updateField('price', formatCurrency(e.target.value))}
                          placeholder="250,000"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  )}
                  {isFieldVisible('earnest_money') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Earnest Money {isFieldRequired('earnest_money') && '*'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)]">$</span>
                        <Input
                          type="text"
                          value={formData.earnest_money}
                          onChange={(e) => updateField('earnest_money', formatCurrency(e.target.value))}
                          placeholder="5,000"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  )}
                  {isFieldVisible('assignment_fee') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Assignment Fee {isFieldRequired('assignment_fee') && '*'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)]">$</span>
                        <Input
                          type="text"
                          value={formData.assignment_fee}
                          onChange={(e) => updateField('assignment_fee', formatCurrency(e.target.value))}
                          placeholder="10,000"
                          className="pl-7"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Escrow Section */}
            {isGroupVisible(['escrow_agent_name', 'escrow_officer', 'escrow_agent_email', 'escrow_agent_address']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Escrow/Title Company</h3>
                <div className="grid grid-cols-2 gap-3">
                  {isFieldVisible('escrow_agent_name') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Company Name {isFieldRequired('escrow_agent_name') && '*'}
                      </Label>
                      <Input
                        value={formData.escrow_agent_name}
                        onChange={(e) => updateField('escrow_agent_name', e.target.value)}
                        placeholder="Title Company LLC"
                      />
                    </div>
                  )}
                  {isFieldVisible('escrow_officer') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Officer Name {isFieldRequired('escrow_officer') && '*'}
                      </Label>
                      <Input
                        value={formData.escrow_officer}
                        onChange={(e) => updateField('escrow_officer', e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                  )}
                  {isFieldVisible('escrow_agent_email') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Email {isFieldRequired('escrow_agent_email') && '*'}
                      </Label>
                      <Input
                        type="email"
                        value={formData.escrow_agent_email}
                        onChange={(e) => updateField('escrow_agent_email', e.target.value)}
                        placeholder="escrow@title.com"
                      />
                    </div>
                  )}
                  {isFieldVisible('escrow_agent_address') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Address {isFieldRequired('escrow_agent_address') && '*'}
                      </Label>
                      <Input
                        value={formData.escrow_agent_address}
                        onChange={(e) => updateField('escrow_agent_address', e.target.value)}
                        placeholder="123 Title St"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dates Section */}
            {isGroupVisible(['close_of_escrow', 'inspection_period']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Important Dates</h3>
                <div className="grid grid-cols-2 gap-3">
                  {isFieldVisible('close_of_escrow') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Close of Escrow {isFieldRequired('close_of_escrow') && '*'}
                      </Label>
                      <Input
                        type="date"
                        value={formData.close_of_escrow}
                        onChange={(e) => updateField('close_of_escrow', e.target.value)}
                      />
                    </div>
                  )}
                  {isFieldVisible('inspection_period') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Inspection Period (Days) {isFieldRequired('inspection_period') && '*'}
                      </Label>
                      <Input
                        type="number"
                        value={formData.inspection_period}
                        onChange={(e) => updateField('inspection_period', e.target.value)}
                        placeholder="e.g., 10"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 1.10 - Closing Amounts */}
            {isGroupVisible(['escrow_fees_split', 'title_policy_paid_by', 'hoa_fees_split']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Closing Amounts (Section 1.10)</h3>
                <p className="text-xs text-[var(--gray-500)] mb-3">Check one option for each, or leave unchecked</p>
                <div className="space-y-4">
                  {isFieldVisible('escrow_fees_split') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)] mb-2 block">
                        Escrow fees and costs: {isFieldRequired('escrow_fees_split') && '*'}
                      </Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.escrow_fees_split === 'split'}
                            onChange={(e) => updateField('escrow_fees_split', e.target.checked ? 'split' : '')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">50% Buyer / 50% Seller</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.escrow_fees_split === 'buyer'}
                            onChange={(e) => updateField('escrow_fees_split', e.target.checked ? 'buyer' : '')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">100% Buyer</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {isFieldVisible('title_policy_paid_by') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)] mb-2 block">
                        Standard title policy paid by: {isFieldRequired('title_policy_paid_by') && '*'}
                      </Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.title_policy_paid_by === 'seller'}
                            onChange={(e) => updateField('title_policy_paid_by', e.target.checked ? 'seller' : '')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Seller</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.title_policy_paid_by === 'buyer'}
                            onChange={(e) => updateField('title_policy_paid_by', e.target.checked ? 'buyer' : '')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Buyer</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {isFieldVisible('hoa_fees_split') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)] mb-2 block">
                        HOA fees (if applicable): {isFieldRequired('hoa_fees_split') && '*'}
                      </Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.hoa_fees_split === 'split'}
                            onChange={(e) => updateField('hoa_fees_split', e.target.checked ? 'split' : '')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">50% Buyer / 50% Seller</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.hoa_fees_split === 'buyer'}
                            onChange={(e) => updateField('hoa_fees_split', e.target.checked ? 'buyer' : '')}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">100% Buyer</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Terms */}
            {isGroupVisible(['personal_property', 'additional_terms']) && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Additional Terms</h3>
                <div className="space-y-3">
                  {isFieldVisible('personal_property') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Personal Property Included {isFieldRequired('personal_property') && '*'}
                      </Label>
                      <Input
                        value={formData.personal_property}
                        onChange={(e) => updateField('personal_property', e.target.value)}
                        placeholder="Leave blank if none, or list items like: Washer, Dryer, Refrigerator"
                      />
                    </div>
                  )}
                  {isFieldVisible('additional_terms') && (
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">
                        Additional Terms & Conditions {isFieldRequired('additional_terms') && '*'}
                      </Label>
                      <textarea
                        value={formData.additional_terms}
                        onChange={(e) => updateField('additional_terms', e.target.value)}
                        placeholder="Leave blank if none, or enter additional terms..."
                        className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[80px]"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Custom Fields from Template */}
          {selectedTemplate?.custom_fields && selectedTemplate.custom_fields.length > 0 && (
            <div className="border-t border-[var(--gray-200)] pt-6 mt-6">
              <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">
                Additional Fields
              </h3>
              <p className="text-xs text-[var(--gray-500)] mb-4">
                Custom fields defined in the template
              </p>
              <div className="grid grid-cols-2 gap-3">
                {selectedTemplate.custom_fields.map((field: CustomField) => (
                  <div key={field.key} className={field.fieldType === 'textarea' ? 'col-span-2' : ''}>
                    <Label className="text-xs text-[var(--gray-600)]">
                      {field.label} {field.required && '*'}
                    </Label>
                    {field.fieldType === 'textarea' ? (
                      <textarea
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.label}
                        className="w-full px-3 py-2 border border-[var(--gray-300)] rounded-md text-sm min-h-[80px]"
                      />
                    ) : (
                      <Input
                        type={
                          field.fieldType === 'number' ? 'number' :
                          field.fieldType === 'date' ? 'date' :
                          field.fieldType === 'email' ? 'email' :
                          field.fieldType === 'phone' ? 'tel' : 'text'
                        }
                        value={customFieldValues[field.key] || ''}
                        onChange={(e) => {
                          let value = e.target.value
                          if (field.fieldType === 'phone') {
                            value = formatPhoneNumber(value)
                          }
                          setCustomFieldValues(prev => ({ ...prev, [field.key]: value }))
                        }}
                        placeholder={field.label}
                        maxLength={field.fieldType === 'phone' ? 14 : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end mt-8 pt-6 border-t border-[var(--gray-200)]">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Contract
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
