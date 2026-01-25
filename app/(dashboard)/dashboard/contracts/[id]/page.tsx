'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Send,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Home,
  User,
  DollarSign,
  ExternalLink,
  Pencil,
  X,
  Save,
  PenTool,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SignatureCanvas from 'react-signature-canvas'
import { AIClauseSection } from '@/components/contracts/ai-clause-section'
import type { AIClause } from '@/components/contracts/clause-review-modal'
import { PLANS, type PlanTier } from '@/lib/plans'

interface CustomFields {
  buyer_phone?: string
  seller_phone?: string
  seller_address?: string
  assignment_fee?: number
  contract_type?: string
  property_address?: string
  property_city?: string
  property_state?: string
  property_zip?: string
  earnest_money?: number
  escrow_agent_name?: string
  escrow_agent_address?: string
  escrow_officer?: string
  escrow_agent_email?: string
  close_of_escrow?: string
  inspection_period?: string
  apn?: string
  personal_property?: string
  additional_terms?: string
  // Section 1.10 closing amounts
  escrow_fees_split?: 'split' | 'buyer'
  title_policy_paid_by?: 'seller' | 'buyer'
  hoa_fees_split?: 'split' | 'buyer'
  // Signature page fields
  company_name?: string
  company_signer_name?: string
  company_email?: string
  company_phone?: string
  buyer_signature?: string // Base64 signature image
  buyer_initials?: string // Base64 initials image
  // AI-generated clauses
  ai_clauses?: AIClause[]
}

interface Contract {
  id: string
  status: string
  buyer_name: string
  buyer_email: string
  seller_name: string
  seller_email: string
  price: number
  created_at: string
  sent_at: string | null
  viewed_at: string | null
  completed_at: string | null
  documenso_document_id: string | null
  signed_pdf_url: string | null
  custom_fields: CustomFields | null
  property: {
    id: string
    address: string
    city: string
    state: string
    zip: string
  } | null
}

interface FormData {
  seller_name: string
  seller_email: string
  seller_phone: string
  seller_address: string
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  price: string
  assignment_fee: string
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  earnest_money: string
  escrow_agent_name: string
  escrow_agent_address: string
  escrow_officer: string
  escrow_agent_email: string
  close_of_escrow: string
  inspection_period: string
  apn: string
  personal_property: string
  additional_terms: string
  // Section 1.10 closing amounts
  escrow_fees_split: string
  title_policy_paid_by: string
  hoa_fees_split: string
  // Signature page fields
  company_name: string
  company_signer_name: string
  company_email: string
  company_phone: string
  buyer_signature: string
  buyer_initials: string
}

interface StatusHistoryItem {
  id: string
  status: string
  created_at: string
  metadata: Record<string, unknown>
}

interface FieldConfig {
  visible: boolean
  required: boolean
  label?: string
  placeholder?: string
}

interface Template {
  id: string
  name: string
  signature_layout?: string
  field_config?: {
    standardFields?: Record<string, FieldConfig>
  }
  custom_fields?: Array<{
    key: string
    label: string
    fieldType: string
    required: boolean
    placeholder?: string
  }>
}

// Format number with commas (e.g., 250000 -> 250,000)
const formatCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('en-US')
}

// Format phone number (e.g., 5551234567 -> (555) 123-4567)
const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length <= 3) {
    return `(${digits}`
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bgColor: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'var(--gray-700)', bgColor: 'var(--gray-100)' },
  sent: { label: 'Sent', icon: Send, color: 'var(--info-700)', bgColor: 'var(--info-100)' },
  viewed: { label: 'Viewed', icon: Eye, color: 'var(--warning-700)', bgColor: 'var(--warning-100)' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'var(--success-700)', bgColor: 'var(--success-100)' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'var(--error-700)', bgColor: 'var(--error-100)' },
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const justSigned = searchParams.get('signed') === 'true'

  const [contract, setContract] = useState<Contract | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [history, setHistory] = useState<StatusHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    seller_name: '',
    seller_email: '',
    seller_phone: '',
    seller_address: '',
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    price: '',
    assignment_fee: '',
    property_address: '',
    property_city: '',
    property_state: '',
    property_zip: '',
    earnest_money: '',
    escrow_agent_name: '',
    escrow_agent_address: '',
    escrow_officer: '',
    escrow_agent_email: '',
    close_of_escrow: '',
    inspection_period: '',
    apn: '',
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
  })
  const [aiClauses, setAiClauses] = useState<AIClause[]>([])
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [typedSignature, setTypedSignature] = useState('')
  const [initialsMode, setInitialsMode] = useState<'draw' | 'type'>('draw')
  const [typedInitials, setTypedInitials] = useState('')
  const signatureRef = useRef<SignatureCanvas>(null)
  const initialsRef = useRef<SignatureCanvas>(null)
  const typedSignatureCanvasRef = useRef<HTMLCanvasElement>(null)

  // Usage/overage state
  const [usageInfo, setUsageInfo] = useState<{
    contractsUsed: number
    contractLimit: number | null
    planName: string
    overagePrice: number
    isOverage: boolean
    overageBehavior: 'auto_charge' | 'warn_each'
  } | null>(null)
  const [pendingSend, setPendingSend] = useState<{ type: 'purchase' | 'assignment' } | null>(null)

  useEffect(() => {
    fetchContract()
    fetchUsageInfo()
  }, [id])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
      if (!res.ok) {
        throw new Error('Contract not found')
      }
      const data = await res.json()
      setContract(data.contract)
      setHistory(data.history || [])
      setTemplate(data.template || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsageInfo = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        const contractsUsed = data.company?.contracts_used_this_period || 0
        const actualPlan = (data.company?.actual_plan || 'free') as PlanTier
        const plan = PLANS[actualPlan]
        const contractLimit = plan.limits.contractsPerMonth
        const overagePrice = plan.limits.overagePricing.extraContractPrice
        const isOverage = contractLimit !== null && contractsUsed >= contractLimit
        const overageBehavior = data.company?.overage_behavior || 'warn_each'
        setUsageInfo({
          contractsUsed,
          contractLimit,
          planName: plan.name,
          overagePrice,
          isOverage,
          overageBehavior,
        })
      }
    } catch (err) {
      console.error('Failed to fetch usage info:', err)
    }
  }

  // Field visibility helpers - based on template's field_config.standardFields
  const isFieldVisible = (fieldName: string): boolean => {
    if (!template?.field_config?.standardFields) return true // Show all if no template config
    const config = template.field_config.standardFields[fieldName]
    return config?.visible !== false // Default to visible if not configured
  }

  const isFieldRequired = (fieldName: string): boolean => {
    if (!template?.field_config?.standardFields) {
      // Default required fields when no template config
      const defaultRequired = ['seller_name', 'seller_email', 'price', 'company_name', 'company_signer_name', 'company_email', 'company_phone', 'buyer_signature', 'buyer_initials']
      return defaultRequired.includes(fieldName)
    }
    const config = template.field_config.standardFields[fieldName]
    return config?.required === true
  }

  const isGroupVisible = (fieldNames: string[]): boolean => {
    return fieldNames.some(name => isFieldVisible(name))
  }

  const isThreeParty = template?.signature_layout === 'three-party'

  // Check if overage warning needed before sending
  const inititateSend = (type: 'purchase' | 'assignment') => {
    // Only show warning if:
    // 1. This is an overage (over contract limit)
    // 2. Plan allows overages (overagePrice > 0)
    // 3. Overage behavior is 'warn_each' (not auto_charge)
    if (usageInfo?.isOverage && usageInfo.overagePrice > 0 && usageInfo.overageBehavior === 'warn_each') {
      // Show confirmation dialog
      setPendingSend({ type })
    } else {
      // Send directly (either not an overage, or auto_charge is enabled)
      handleSend(type)
    }
  }

  // Confirm and proceed with send
  const confirmSend = () => {
    if (pendingSend) {
      handleSend(pendingSend.type)
      setPendingSend(null)
    }
  }

  const handleSend = async (type: 'purchase' | 'assignment' = 'purchase') => {
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      if (!res.ok) {
        const data = await res.json()
        // Handle payment required error specially
        if (data.paymentRequired) {
          setError('Payment past due - please update your payment method in Settings > Billing to continue sending contracts.')
          return
        }
        throw new Error(data.error || 'Failed to send contract')
      }

      await fetchContract()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send contract')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contract?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete contract')
      }

      router.push('/dashboard/contracts')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contract')
      setDeleting(false)
    }
  }

  const handlePreview = async (type: 'purchase' | 'assignment' = 'purchase') => {
    setPreviewLoading(true)
    setError(null)

    try {
      // Open preview in new tab
      window.open(`/api/contracts/${id}/preview?type=${type}`, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const startEditing = () => {
    if (!contract) return
    setFormData({
      seller_name: contract.seller_name || '',
      seller_email: contract.seller_email || '',
      seller_phone: contract.custom_fields?.seller_phone || '',
      seller_address: contract.custom_fields?.seller_address || '',
      buyer_name: contract.buyer_name || '',
      buyer_email: contract.buyer_email || '',
      buyer_phone: contract.custom_fields?.buyer_phone || '',
      price: contract.price ? formatCurrency(contract.price.toString()) : '',
      assignment_fee: contract.custom_fields?.assignment_fee ? formatCurrency(contract.custom_fields.assignment_fee.toString()) : '',
      property_address: contract.custom_fields?.property_address || contract.property?.address || '',
      property_city: contract.custom_fields?.property_city || contract.property?.city || '',
      property_state: contract.custom_fields?.property_state || contract.property?.state || '',
      property_zip: contract.custom_fields?.property_zip || contract.property?.zip || '',
      earnest_money: contract.custom_fields?.earnest_money ? formatCurrency(contract.custom_fields.earnest_money.toString()) : '',
      escrow_agent_name: contract.custom_fields?.escrow_agent_name || '',
      escrow_agent_address: contract.custom_fields?.escrow_agent_address || '',
      escrow_officer: contract.custom_fields?.escrow_officer || '',
      escrow_agent_email: contract.custom_fields?.escrow_agent_email || '',
      close_of_escrow: contract.custom_fields?.close_of_escrow || '',
      inspection_period: contract.custom_fields?.inspection_period || '',
      apn: contract.custom_fields?.apn || '',
      personal_property: contract.custom_fields?.personal_property || '',
      additional_terms: contract.custom_fields?.additional_terms || '',
      escrow_fees_split: contract.custom_fields?.escrow_fees_split || '',
      title_policy_paid_by: contract.custom_fields?.title_policy_paid_by || '',
      hoa_fees_split: contract.custom_fields?.hoa_fees_split || '',
      company_name: contract.custom_fields?.company_name || '',
      company_signer_name: contract.custom_fields?.company_signer_name || '',
      company_email: contract.custom_fields?.company_email || '',
      company_phone: contract.custom_fields?.company_phone || '',
      buyer_signature: contract.custom_fields?.buyer_signature || '',
      buyer_initials: contract.custom_fields?.buyer_initials || '',
    })
    setAiClauses(contract.custom_fields?.ai_clauses || [])
    setIsEditing(true)
  }

  const clearSignature = () => {
    signatureRef.current?.clear()
    setTypedSignature('')
  }

  const clearInitials = () => {
    initialsRef.current?.clear()
    setTypedInitials('')
    updateField('buyer_initials', '')
  }

  const saveDrawnInitials = () => {
    if (initialsRef.current) {
      const dataUrl = initialsRef.current.toDataURL('image/png')
      updateField('buyer_initials', dataUrl)
    }
  }

  const saveTypedInitials = () => {
    if (!typedInitials.trim()) return
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = 100
    canvas.height = 50
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'black'
    ctx.font = '32px "Dancing Script", "Brush Script MT", cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(typedInitials.toUpperCase(), canvas.width / 2, canvas.height / 2)
    const dataUrl = canvas.toDataURL('image/png')
    updateField('buyer_initials', dataUrl)
  }

  const saveDrawnSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const dataUrl = signatureRef.current.toDataURL('image/png')
      updateField('buyer_signature', dataUrl)
    }
  }

  const saveTypedSignature = () => {
    if (!typedSignature.trim()) return

    // Create a canvas to render the typed signature
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 100

    // Fill with white background
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set up the cursive font
    ctx.fillStyle = 'black'
    ctx.font = '48px "Dancing Script", "Brush Script MT", cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw the text
    ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2)

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png')
    updateField('buyer_signature', dataUrl)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    // Helper to parse formatted currency (remove commas)
    const parseCurrency = (value: string) => {
      const num = parseFloat(value.replace(/,/g, ''))
      return isNaN(num) ? undefined : num
    }

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_name: formData.seller_name,
          seller_email: formData.seller_email,
          buyer_name: formData.buyer_name,
          buyer_email: formData.buyer_email,
          price: parseCurrency(formData.price) || 0,
          custom_fields: {
            ...contract?.custom_fields,
            seller_phone: formData.seller_phone,
            seller_address: formData.seller_address,
            buyer_phone: formData.buyer_phone,
            assignment_fee: parseCurrency(formData.assignment_fee),
            property_address: formData.property_address,
            property_city: formData.property_city,
            property_state: formData.property_state,
            property_zip: formData.property_zip,
            earnest_money: parseCurrency(formData.earnest_money),
            escrow_agent_name: formData.escrow_agent_name,
            escrow_agent_address: formData.escrow_agent_address,
            escrow_officer: formData.escrow_officer,
            escrow_agent_email: formData.escrow_agent_email,
            close_of_escrow: formData.close_of_escrow,
            inspection_period: formData.inspection_period,
            apn: formData.apn,
            personal_property: formData.personal_property,
            additional_terms: formData.additional_terms,
            escrow_fees_split: formData.escrow_fees_split,
            title_policy_paid_by: formData.title_policy_paid_by,
            hoa_fees_split: formData.hoa_fees_split,
            company_name: formData.company_name,
            company_signer_name: formData.company_signer_name,
            company_email: formData.company_email,
            company_phone: formData.company_phone,
            buyer_signature: formData.buyer_signature,
            buyer_initials: formData.buyer_initials,
            ai_clauses: aiClauses,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save contract')
      }

      await fetchContract()
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save contract')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gray-400)]" />
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-[var(--error-700)] mx-auto mb-4" />
        <p className="text-[var(--gray-700)]">{error}</p>
        <Link href="/dashboard/contracts">
          <Button variant="outline" className="mt-4">
            Back to Contracts
          </Button>
        </Link>
      </div>
    )
  }

  if (!contract) return null

  const status = statusConfig[contract.status] || statusConfig.draft
  const StatusIcon = status.icon
  const propertyAddress = contract.custom_fields?.property_address || contract.property?.address || ''
  const propertyCity = contract.custom_fields?.property_city || contract.property?.city || ''
  const propertyState = contract.custom_fields?.property_state || contract.property?.state || ''
  const propertyZip = contract.custom_fields?.property_zip || contract.property?.zip || ''
  // Determine contract type from template signature_layout
  const signatureLayout = template?.signature_layout
  const contractType = signatureLayout === 'three-party' ? 'assignment' : 'purchase'

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

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gray-900)]">
              {propertyAddress}
            </h1>
            <p className="text-sm text-[var(--gray-600)]">
              {propertyCity}, {propertyState} {propertyZip}
            </p>
          </div>

          <div
            className="px-3 py-1.5 rounded flex items-center gap-2"
            style={{ backgroundColor: status.bgColor, color: status.color }}
          >
            <StatusIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Success message after signing */}
      {justSigned && (
        <div className="mb-6 p-4 bg-[var(--success-100)] border border-[var(--success-700)] rounded">
          <div className="flex items-center gap-2 text-[var(--success-700)]">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Document signed successfully!</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-[var(--error-100)] border border-[var(--error-700)] rounded">
          <div className="flex items-center gap-2 text-[var(--error-700)]">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Contract Details */}
          <div className="bg-white border border-[var(--gray-200)] rounded">
            <div className="px-4 py-3 border-b border-[var(--gray-200)] flex items-center justify-between">
              <h2 className="font-semibold text-[var(--gray-900)]">Contract Details</h2>
              {contract.status === 'draft' && !isEditing && (
                <Button
                  onClick={startEditing}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    onClick={cancelEditing}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="text-xs bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                  >
                    {saving ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3 mr-1" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>
            <div className="p-4">
              {isEditing ? (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Property Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                      <Home className="w-4 h-4 text-[var(--gray-400)]" />
                      Property
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label className="text-xs text-[var(--gray-600)]">Address</Label>
                        <Input
                          value={formData.property_address}
                          onChange={(e) => updateField('property_address', e.target.value)}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">City</Label>
                        <Input
                          value={formData.property_city}
                          onChange={(e) => updateField('property_city', e.target.value)}
                          placeholder="City"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-[var(--gray-600)]">State</Label>
                          <Input
                            value={formData.property_state}
                            onChange={(e) => updateField('property_state', e.target.value)}
                            placeholder="FL"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-[var(--gray-600)]">ZIP</Label>
                          <Input
                            value={formData.property_zip}
                            onChange={(e) => updateField('property_zip', e.target.value)}
                            placeholder="12345"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-[var(--gray-600)]">APN/Parcel Number</Label>
                        <Input
                          value={formData.apn}
                          onChange={(e) => updateField('apn', e.target.value)}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>

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
                              {isThreeParty ? ' (Signs 1st)' : ''}
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

                  {/* Buyer/Assignee Section */}
                  {isGroupVisible(['buyer_name', 'buyer_email', 'buyer_phone']) && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--gray-400)]" />
                        {isThreeParty ? 'Assignee (End Buyer)' : 'End Buyer (for Assignment)'}
                      </h3>
                      <p className="text-xs text-[var(--gray-500)] mb-3">
                        {isThreeParty
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
                            {isThreeParty && (
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
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[var(--gray-400)]" />
                      Pricing
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Purchase Price *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray-500)]">$</span>
                          <Input
                            type="text"
                            value={formData.price}
                            onChange={(e) => updateField('price', formatCurrency(e.target.value))}
                            placeholder="250,000"
                            className="pl-7"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Earnest Money</Label>
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
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Assignment Fee</Label>
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
                    </div>
                  </div>

                  {/* Escrow Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Escrow/Title Company</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Company Name</Label>
                        <Input
                          value={formData.escrow_agent_name}
                          onChange={(e) => updateField('escrow_agent_name', e.target.value)}
                          placeholder="Title Company LLC"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Officer Name</Label>
                        <Input
                          value={formData.escrow_officer}
                          onChange={(e) => updateField('escrow_officer', e.target.value)}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Email</Label>
                        <Input
                          type="email"
                          value={formData.escrow_agent_email}
                          onChange={(e) => updateField('escrow_agent_email', e.target.value)}
                          placeholder="escrow@title.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Address</Label>
                        <Input
                          value={formData.escrow_agent_address}
                          onChange={(e) => updateField('escrow_agent_address', e.target.value)}
                          placeholder="123 Title St"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dates Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Important Dates</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Close of Escrow</Label>
                        <Input
                          type="date"
                          value={formData.close_of_escrow}
                          onChange={(e) => updateField('close_of_escrow', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Inspection Period (Days)</Label>
                        <Input
                          type="number"
                          value={formData.inspection_period}
                          onChange={(e) => updateField('inspection_period', e.target.value)}
                          placeholder="e.g., 10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 1.10 - Closing Amounts */}
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Closing Amounts (Section 1.10)</h3>
                    <p className="text-xs text-[var(--gray-500)] mb-3">Check one option for each, or leave unchecked</p>
                    <div className="space-y-4">
                      {/* Escrow Fees */}
                      <div>
                        <Label className="text-xs text-[var(--gray-600)] mb-2 block">Escrow fees and costs:</Label>
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

                      {/* Title Policy */}
                      <div>
                        <Label className="text-xs text-[var(--gray-600)] mb-2 block">Standard title policy paid by:</Label>
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

                      {/* HOA Fees */}
                      <div>
                        <Label className="text-xs text-[var(--gray-600)] mb-2 block">HOA fees (if applicable):</Label>
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
                    </div>
                  </div>

                  {/* Additional Terms */}
                  {isGroupVisible(['personal_property', 'additional_terms']) && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Additional Terms</h3>
                    <div className="space-y-3">
                      {isFieldVisible('personal_property') && (
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Personal Property Included</Label>
                        <Input
                          value={formData.personal_property}
                          onChange={(e) => updateField('personal_property', e.target.value)}
                          placeholder="Leave blank if none, or list items like: Washer, Dryer, Refrigerator"
                        />
                      </div>
                      )}
                      {isFieldVisible('additional_terms') && (
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Additional Terms & Conditions</Label>
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

                  {/* Signature Page - Buyer/Company Details */}
                  <div className="border-t border-[var(--gray-200)] pt-6">
                    <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-1 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-[var(--gray-400)]" />
                      {isThreeParty ? 'Assignor Signature (Your Company)' : 'Buyer Signature Page (Your Company)'}
                    </h3>
                    <p className="text-xs text-[var(--gray-500)] mb-4">
                      {isThreeParty
                        ? 'Your company pre-signs as the Assignor (wholesaler). This signature will be embedded in the contract before sending to other parties.'
                        : 'These fields appear on the signature page of the contract. All fields marked with * are required before sending.'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Company Name *</Label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => updateField('company_name', e.target.value)}
                          placeholder="Enter your company name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Signer Name *</Label>
                        <Input
                          value={formData.company_signer_name}
                          onChange={(e) => updateField('company_signer_name', e.target.value)}
                          placeholder="Person signing the contract"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Company Email *</Label>
                        <Input
                          type="email"
                          value={formData.company_email}
                          onChange={(e) => updateField('company_email', e.target.value)}
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Company Phone *</Label>
                        <Input
                          value={formData.company_phone}
                          onChange={(e) => updateField('company_phone', formatPhoneNumber(e.target.value))}
                          placeholder="(555) 123-4567"
                          maxLength={14}
                        />
                      </div>
                    </div>

                    {/* Buyer Signature */}
                    <div>
                      <Label className="text-xs text-[var(--gray-600)] mb-2 block">Buyer Signature *</Label>
                      {formData.buyer_signature ? (
                        <div className="space-y-2">
                          <div className="border border-[var(--gray-300)] rounded-md p-2 bg-white">
                            <img
                              src={formData.buyer_signature}
                              alt="Signature"
                              className="max-h-20 mx-auto"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearSignature}
                            className="text-xs"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Clear & Re-sign
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Signature Mode Toggle */}
                          <div className="flex border border-[var(--gray-300)] rounded-md overflow-hidden">
                            <button
                              type="button"
                              onClick={() => setSignatureMode('draw')}
                              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                signatureMode === 'draw'
                                  ? 'bg-[var(--primary-900)] text-white'
                                  : 'bg-white text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
                              }`}
                            >
                              <PenTool className="w-3 h-3 inline mr-1" />
                              Draw
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignatureMode('type')}
                              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--gray-300)] ${
                                signatureMode === 'type'
                                  ? 'bg-[var(--primary-900)] text-white'
                                  : 'bg-white text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
                              }`}
                            >
                              Type
                            </button>
                          </div>

                          {signatureMode === 'draw' ? (
                            /* Draw Signature */
                            <div className="space-y-2">
                              <div className="border border-[var(--gray-300)] rounded-md bg-white">
                                <SignatureCanvas
                                  ref={signatureRef}
                                  canvasProps={{
                                    className: 'w-full h-24 rounded-md',
                                    style: { width: '100%', height: '96px' }
                                  }}
                                  backgroundColor="white"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => signatureRef.current?.clear()}
                                  className="text-xs"
                                >
                                  <RotateCcw className="w-3 h-3 mr-1" />
                                  Clear
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={saveDrawnSignature}
                                  className="text-xs bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Save Signature
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Type Signature */
                            <div className="space-y-2">
                              <Input
                                value={typedSignature}
                                onChange={(e) => setTypedSignature(e.target.value)}
                                placeholder="Type your name"
                                className="text-base"
                              />
                              {typedSignature && (
                                <div className="border border-[var(--gray-300)] rounded-md p-4 bg-white min-h-[96px] flex items-center justify-center">
                                  <span
                                    style={{
                                      fontFamily: '"Dancing Script", "Brush Script MT", cursive',
                                      fontSize: '36px',
                                      color: '#000'
                                    }}
                                  >
                                    {typedSignature}
                                  </span>
                                </div>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                onClick={saveTypedSignature}
                                disabled={!typedSignature.trim()}
                                className="text-xs bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Save Signature
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Buyer Initials - Only for non-three-party templates */}
                    {!isThreeParty && (
                      <div>
                        <Label className="text-xs text-[var(--gray-600)] mb-2 block">Buyer Initials *</Label>
                        {formData.buyer_initials ? (
                          <div className="space-y-2">
                            <div className="border border-[var(--gray-300)] rounded-md p-2 bg-white inline-block">
                              <img
                                src={formData.buyer_initials}
                                alt="Initials"
                                className="h-12"
                              />
                            </div>
                            <div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={clearInitials}
                                className="text-xs"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Clear & Re-initial
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Initials Mode Toggle */}
                            <div className="flex border border-[var(--gray-300)] rounded-md overflow-hidden w-48">
                              <button
                                type="button"
                                onClick={() => setInitialsMode('draw')}
                                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                  initialsMode === 'draw'
                                    ? 'bg-[var(--primary-900)] text-white'
                                    : 'bg-white text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
                                }`}
                              >
                                <PenTool className="w-3 h-3 inline mr-1" />
                                Draw
                              </button>
                              <button
                                type="button"
                                onClick={() => setInitialsMode('type')}
                                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--gray-300)] ${
                                  initialsMode === 'type'
                                    ? 'bg-[var(--primary-900)] text-white'
                                    : 'bg-white text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
                                }`}
                              >
                                Type
                              </button>
                            </div>

                            {initialsMode === 'draw' ? (
                              /* Draw Initials */
                              <div className="space-y-2">
                                <div className="border border-[var(--gray-300)] rounded-md bg-white inline-block">
                                  <SignatureCanvas
                                    ref={initialsRef}
                                    canvasProps={{
                                      className: 'rounded-md',
                                      style: { width: '100px', height: '50px' }
                                    }}
                                    backgroundColor="white"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => initialsRef.current?.clear()}
                                    className="text-xs"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Clear
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={saveDrawnInitials}
                                    className="text-xs bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Save Initials
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              /* Type Initials */
                              <div className="space-y-2">
                                <Input
                                  value={typedInitials}
                                  onChange={(e) => setTypedInitials(e.target.value.slice(0, 4))}
                                  placeholder="e.g. JD"
                                  className="text-base w-24"
                                  maxLength={4}
                                />
                                {typedInitials && (
                                  <div className="border border-[var(--gray-300)] rounded-md p-2 bg-white inline-block min-w-[100px] min-h-[50px] flex items-center justify-center">
                                    <span
                                      style={{
                                        fontFamily: '"Dancing Script", "Brush Script MT", cursive',
                                        fontSize: '28px',
                                        color: '#000'
                                      }}
                                    >
                                      {typedInitials.toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={saveTypedInitials}
                                    disabled={!typedInitials.trim()}
                                    className="text-xs bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Save Initials
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* AI Clause Generation Section */}
                  <AIClauseSection
                    contractDetails={{
                      property_address: formData.property_address,
                      property_city: formData.property_city,
                      property_state: formData.property_state,
                      property_zip: formData.property_zip,
                      price: formData.price,
                      seller_name: formData.seller_name,
                      close_of_escrow: formData.close_of_escrow,
                      inspection_period: formData.inspection_period,
                    }}
                    approvedClauses={aiClauses}
                    onClausesChange={setAiClauses}
                  />
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  {/* Property */}
                  <div className="flex items-start gap-3">
                    <Home className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--gray-700)]">Property</p>
                      <p className="text-sm text-[var(--gray-900)]">
                        {propertyAddress}, {propertyCity}, {propertyState} {propertyZip}
                      </p>
                      {contract.custom_fields?.apn && (
                        <p className="text-sm text-[var(--gray-600)]">APN: {contract.custom_fields.apn}</p>
                      )}
                    </div>
                  </div>

                  {/* Seller */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--gray-700)]">Seller</p>
                      <p className="text-sm text-[var(--gray-900)]">{contract.seller_name}</p>
                      <p className="text-sm text-[var(--gray-600)]">{contract.seller_email}</p>
                      {contract.custom_fields?.seller_phone && (
                        <p className="text-sm text-[var(--gray-600)]">{contract.custom_fields.seller_phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Buyer */}
                  {(contract.buyer_name || contract.buyer_email) && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--gray-700)]">End Buyer</p>
                        <p className="text-sm text-[var(--gray-900)]">{contract.buyer_name}</p>
                        <p className="text-sm text-[var(--gray-600)]">{contract.buyer_email}</p>
                        {contract.custom_fields?.buyer_phone && (
                          <p className="text-sm text-[var(--gray-600)]">{contract.custom_fields.buyer_phone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--gray-700)]">Purchase Price</p>
                      <p className="text-sm text-[var(--gray-900)] font-semibold">
                        ${Number(contract.price).toLocaleString()}
                      </p>
                      {contract.custom_fields?.earnest_money && contract.custom_fields.earnest_money > 0 && (
                        <p className="text-sm text-[var(--gray-600)]">
                          Earnest Money: ${contract.custom_fields.earnest_money.toLocaleString()}
                        </p>
                      )}
                      {contract.custom_fields?.assignment_fee && contract.custom_fields.assignment_fee > 0 && (
                        <p className="text-sm text-[var(--gray-600)]">
                          Assignment Fee: ${contract.custom_fields.assignment_fee.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Escrow Info */}
                  {contract.custom_fields?.escrow_agent_name && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--gray-700)]">Escrow/Title</p>
                        <p className="text-sm text-[var(--gray-900)]">{contract.custom_fields.escrow_agent_name}</p>
                        {contract.custom_fields.escrow_officer && (
                          <p className="text-sm text-[var(--gray-600)]">{contract.custom_fields.escrow_officer}</p>
                        )}
                        {contract.custom_fields.escrow_agent_email && (
                          <p className="text-sm text-[var(--gray-600)]">{contract.custom_fields.escrow_agent_email}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  {(contract.custom_fields?.close_of_escrow || contract.custom_fields?.inspection_period) && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--gray-700)]">Important Dates</p>
                        {contract.custom_fields.close_of_escrow && (
                          <p className="text-sm text-[var(--gray-600)]">
                            Close of Escrow: {new Date(contract.custom_fields.close_of_escrow).toLocaleDateString()}
                          </p>
                        )}
                        {contract.custom_fields.inspection_period && (
                          <p className="text-sm text-[var(--gray-600)]">
                            Inspection Period: {contract.custom_fields.inspection_period} Days
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Clauses */}
                  {contract.custom_fields?.ai_clauses && contract.custom_fields.ai_clauses.length > 0 && (
                    <div className="flex items-start gap-3 pt-4 border-t border-[var(--gray-200)]">
                      <Sparkles className="w-5 h-5 text-[var(--primary-700)] mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[var(--gray-700)] mb-2">
                          AI-Generated Clauses ({contract.custom_fields.ai_clauses.length})
                        </p>
                        <div className="space-y-2">
                          {contract.custom_fields.ai_clauses.map((clause: AIClause) => (
                            <div key={clause.id} className="bg-[var(--gray-50)] rounded p-3">
                              <p className="text-xs font-medium text-[var(--primary-700)] mb-1">
                                {clause.title}
                              </p>
                              <p className="text-sm text-[var(--gray-700)]">
                                {clause.editedContent || clause.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-[var(--gray-200)] rounded">
            <div className="px-4 py-3 border-b border-[var(--gray-200)]">
              <h2 className="font-semibold text-[var(--gray-900)]">Activity Timeline</h2>
            </div>
            <div className="p-4">
              {history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((item, index) => {
                    const itemStatus = statusConfig[item.status] || statusConfig.draft
                    const ItemIcon = itemStatus.icon
                    return (
                      <div key={item.id} className="flex gap-3">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                            index === 0 ? '' : 'opacity-50'
                          }`}
                          style={{ backgroundColor: itemStatus.bgColor, color: itemStatus.color }}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[var(--gray-900)]">
                            {itemStatus.label}
                          </p>
                          <p className="text-xs text-[var(--gray-500)]">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--gray-500)]">No activity yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Send Contract - Email Recipients */}
          {contract.status === 'draft' && (
            <div className="bg-white border border-[var(--gray-200)] rounded">
              <div className="px-4 py-3 border-b border-[var(--gray-200)]">
                <h2 className="font-semibold text-[var(--gray-900)]">Send Contract</h2>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-[var(--gray-600)]">
                  The signing document will be sent to these email addresses via Documenso.
                </p>

                {/* Seller Email */}
                <div>
                  <Label className="text-xs text-[var(--gray-600)]">
                    Seller Email {isThreeParty && <span className="text-[var(--primary-600)]">(Signs 1st)</span>}
                  </Label>
                  <div className="mt-1 px-3 py-2 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded text-sm">
                    {contract.seller_email || <span className="text-[var(--gray-400)]">Not set</span>}
                  </div>
                </div>

                {/* Assignee Email - only for three-party */}
                {isThreeParty && (
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">
                      Assignee Email <span className="text-[var(--primary-600)]">(Signs 2nd)</span>
                    </Label>
                    <div className="mt-1 px-3 py-2 bg-[var(--gray-50)] border border-[var(--gray-200)] rounded text-sm">
                      {contract.buyer_email || <span className="text-[var(--gray-400)]">Not set</span>}
                    </div>
                  </div>
                )}

                {(!contract.seller_email || (isThreeParty && !contract.buyer_email)) && (
                  <p className="text-xs text-[var(--warning-700)] bg-[var(--warning-100)] p-2 rounded">
                    Click &quot;Edit&quot; above to add missing email addresses before sending.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white border border-[var(--gray-200)] rounded">
            <div className="px-4 py-3 border-b border-[var(--gray-200)]">
              <h2 className="font-semibold text-[var(--gray-900)]">Actions</h2>
            </div>
            <div className="p-4 space-y-3">
              {contract.status === 'draft' && (
                <>
                  {/* Preview Button */}
                  <Button
                    onClick={() => handlePreview(contractType)}
                    disabled={previewLoading}
                    variant="outline"
                    className="w-full"
                  >
                    {previewLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Preview {contractType === 'assignment' ? 'Assignment Contract' : 'Purchase Agreement'}
                  </Button>

                  <hr className="my-2 border-[var(--gray-200)]" />

                  {/* Send Button */}
                  <Button
                    onClick={() => inititateSend(contractType)}
                    disabled={sending}
                    className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send {contractType === 'assignment' ? 'Assignment Contract' : 'Purchase Agreement'}
                  </Button>

                  <hr className="my-2 border-[var(--gray-200)]" />

                  <Button
                    onClick={handleDelete}
                    disabled={deleting}
                    variant="outline"
                    className="w-full border-[var(--error-700)] text-[var(--error-700)] hover:bg-[var(--error-100)]"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Contract
                  </Button>
                </>
              )}

              {contract.status === 'sent' && contract.documenso_document_id && (
                <div className="text-center py-4">
                  <Clock className="w-8 h-8 text-[var(--info-700)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--gray-700)]">
                    Waiting for signatures...
                  </p>
                  <p className="text-xs text-[var(--gray-500)] mt-1">
                    The contract has been sent to all parties for signing.
                  </p>
                </div>
              )}

              {contract.status === 'completed' && (
                <>
                  {contract.signed_pdf_url && (
                    <a
                      href={contract.signed_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <Button className="w-full bg-[var(--success-600)] hover:bg-[var(--success-700)] text-white">
                        <Download className="w-4 h-4 mr-2" />
                        Download Signed PDF
                      </Button>
                    </a>
                  )}
                  <div className="text-center py-2">
                    <CheckCircle className="w-8 h-8 text-[var(--success-700)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--gray-700)]">
                      Contract completed!
                    </p>
                  </div>
                </>
              )}

              {contract.documenso_document_id && (
                <a
                  href={`${process.env.NEXT_PUBLIC_DOCUMENSO_URL || 'http://localhost:3001'}/documents/${contract.documenso_document_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Documenso
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-[var(--gray-50)] border border-[var(--gray-200)] rounded p-4">
            <h3 className="text-sm font-medium text-[var(--gray-700)] mb-2">Contract Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--gray-500)]">Type:</span>
                <span className="text-[var(--gray-900)] capitalize">{contractType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--gray-500)]">Created:</span>
                <span className="text-[var(--gray-900)]">
                  {new Date(contract.created_at).toLocaleDateString()}
                </span>
              </div>
              {contract.sent_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--gray-500)]">Sent:</span>
                  <span className="text-[var(--gray-900)]">
                    {new Date(contract.sent_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {contract.completed_at && (
                <div className="flex justify-between">
                  <span className="text-[var(--gray-500)]">Completed:</span>
                  <span className="text-[var(--gray-900)]">
                    {new Date(contract.completed_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overage Confirmation Modal */}
      {pendingSend && usageInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--gray-900)]">
                  Contract Limit Reached
                </h3>
                <p className="text-sm text-[var(--gray-600)] mt-1">
                  You&apos;ve used {usageInfo.contractsUsed} of your {usageInfo.contractLimit} monthly contracts on the {usageInfo.planName} plan.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-800">
                <strong>Overage Charge:</strong> This contract will be billed at{' '}
                <span className="font-semibold">${(usageInfo.overagePrice / 100).toFixed(2)}</span>{' '}
                on your next invoice.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setPendingSend(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmSend}
                disabled={sending}
                className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
