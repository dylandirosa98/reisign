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
import { CompanyTemplate } from '@/types/database'

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

  // Check if template is three-party (for UI hints)
  const isThreeParty = selectedTemplate?.signature_layout === 'three-party'

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): string | null => {
    // Property fields - always required
    if (!formData.property_address.trim()) {
      return 'Property address is required'
    }
    if (!formData.property_city.trim()) {
      return 'Property city is required'
    }
    if (!formData.property_state) {
      return 'Property state is required'
    }
    if (!formData.property_zip.trim()) {
      return 'Property ZIP code is required'
    }
    // Seller fields - always required
    if (!formData.seller_name.trim()) {
      return 'Seller name is required'
    }
    if (!formData.seller_email.trim()) {
      return 'Seller email is required'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.seller_email)) {
      return 'Invalid seller email format'
    }
    // Purchase price - always required
    if (!formData.price.trim()) {
      return 'Purchase price is required'
    }
    if (isNaN(parseFloat(formData.price.replace(/[,$]/g, '')))) {
      return 'Invalid purchase price format'
    }
    // Buyer fields - required for three-party templates
    if (isThreeParty) {
      if (!formData.buyer_name.trim()) {
        return 'Buyer/Assignee name is required for this contract type'
      }
      if (!formData.buyer_email.trim()) {
        return 'Buyer/Assignee email is required for this contract type'
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.buyer_email)) {
        return 'Invalid buyer email format'
      }
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
          },
          customFields: {
            // Only basic fields - rest will be added via edit
            property_address: formData.property_address,
            property_city: formData.property_city,
            property_state: formData.property_state,
            property_zip: formData.property_zip,
            seller_phone: formData.seller_phone,
            buyer_phone: formData.buyer_phone,
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
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowTemplateSelector(false)
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

      {/* Form - Only show if template is selected */}
      {!selectedTemplate && !loadingTemplates ? (
        <div className="bg-white border border-[var(--gray-200)] rounded p-8 text-center">
          <FileText className="w-12 h-12 text-[var(--gray-400)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--gray-900)] mb-2">Select a Template</h3>
          <p className="text-sm text-[var(--gray-600)] mb-4">
            Please select a template above to start creating your contract.
          </p>
        </div>
      ) : loadingTemplates ? (
        <div className="bg-white border border-[var(--gray-200)] rounded p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-600)] mx-auto mb-3" />
          <p className="text-sm text-[var(--gray-600)]">Loading template...</p>
        </div>
      ) : (
      <div className="bg-white border border-[var(--gray-200)] rounded">
        <div className="px-4 py-3 border-b border-[var(--gray-200)]">
          <h2 className="font-semibold text-[var(--gray-900)]">Basic Contract Info</h2>
          <p className="text-xs text-[var(--gray-500)] mt-1">
            Enter the essential details to create your contract. You can add more details after creation.
          </p>
        </div>
        <div className="p-4">
          <div className="space-y-6">
            {/* Property Section */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                <Home className="w-4 h-4 text-[var(--gray-400)]" />
                Property Address
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs text-[var(--gray-600)]">Street Address *</Label>
                  <Input
                    value={formData.property_address}
                    onChange={(e) => updateField('property_address', e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--gray-600)]">City *</Label>
                  <Input
                    value={formData.property_city}
                    onChange={(e) => updateField('property_city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">State *</Label>
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
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">ZIP *</Label>
                    <Input
                      value={formData.property_zip}
                      onChange={(e) => updateField('property_zip', e.target.value)}
                      placeholder="12345"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Section */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--gray-400)]" />
                Seller Info
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-[var(--gray-600)]">Name *</Label>
                  <Input
                    value={formData.seller_name}
                    onChange={(e) => updateField('seller_name', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--gray-600)]">Email *</Label>
                  <Input
                    type="email"
                    value={formData.seller_email}
                    onChange={(e) => updateField('seller_email', e.target.value)}
                    placeholder="seller@email.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-[var(--gray-600)]">Phone</Label>
                  <Input
                    value={formData.seller_phone}
                    onChange={(e) => updateField('seller_phone', formatPhoneNumber(e.target.value))}
                    placeholder="(555) 123-4567"
                    maxLength={14}
                  />
                </div>
              </div>
            </div>

            {/* Buyer/Assignee Section - Only show for three-party templates */}
            {isThreeParty && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--gray-400)]" />
                  Assignee (End Buyer)
                </h3>
                <p className="text-xs text-[var(--gray-500)] mb-3">
                  Required for three-party assignment contracts
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Name *</Label>
                    <Input
                      value={formData.buyer_name}
                      onChange={(e) => updateField('buyer_name', e.target.value)}
                      placeholder="End buyer name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Email *</Label>
                    <Input
                      type="email"
                      value={formData.buyer_email}
                      onChange={(e) => updateField('buyer_email', e.target.value)}
                      placeholder="buyer@email.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Phone</Label>
                    <Input
                      value={formData.buyer_phone}
                      onChange={(e) => updateField('buyer_phone', formatPhoneNumber(e.target.value))}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Price */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--gray-400)]" />
                Purchase Price
              </h3>
              <div className="max-w-xs">
                <Label className="text-xs text-[var(--gray-600)]">Amount *</Label>
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
            </div>

          </div>

          {/* Info about editing */}
          <div className="mt-6 p-3 bg-[var(--gray-50)] rounded-lg border border-[var(--gray-200)]">
            <p className="text-xs text-[var(--gray-600)]">
              <strong>After creating:</strong> You&apos;ll be able to edit all contract details including escrow info, dates, closing amounts, and more.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end mt-6 pt-6 border-t border-[var(--gray-200)]">
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
