'use client'

import React, { useState, useEffect, use, useRef, useCallback, useImperativeHandle } from 'react'
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
  Mail,
  RefreshCw,
  FileEdit,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import SignatureCanvas from 'react-signature-canvas'
import { AIClauseSection } from '@/components/contracts/ai-clause-section'
import { InlineAIClauseZone } from '@/components/contracts/inline-ai-clause-zone'
import type { AIClause } from '@/components/contracts/clause-review-modal'
import { PLANS, type PlanTier } from '@/lib/plans'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CustomFields {
  buyer_phone?: string
  seller_phone?: string
  seller_address?: string
  assignee_address?: string
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
  // Full document HTML override (from rich text editor)
  html_override?: string
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
  html_content?: string
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

// Fields that are auto-generated and should not be inline-editable
const SKIP_INLINE_FIELDS = new Set([
  'buyer_signature_img', 'buyer_initials_img', 'ai_clauses', 'contract_date',
  'company_full_address', 'full_property_address',
])

// Fields that should use date input
const DATE_FIELDS = new Set(['close_of_escrow', 'closing_date', 'effective_date', 'expiration_date'])

// Fields that represent monetary values (auto-format with commas)
const MONETARY_FIELDS = new Set([
  'purchase_price', 'earnest_money', 'assignment_fee',
  'repair_cost_limit', 'deposit_amount', 'option_fee',
])

export interface InlineDocumentEditorRef {
  captureHtmlOverride: () => string | null
  isInFullEditMode: () => boolean
}

const InlineDocumentEditor = React.forwardRef<InlineDocumentEditorRef, {
  htmlContent: string
  values: Record<string, string>
  onValuesChange: (values: Record<string, string>) => void
  aiClauses?: AIClause[]
  onAiClausesChange?: (clauses: AIClause[]) => void
  contractDetails?: {
    property_address?: string
    property_city?: string
    property_state?: string
    property_zip?: string
    price?: string
    seller_name?: string
    close_of_escrow?: string
    inspection_period?: string
  }
  existingHtmlOverride?: string
  onHtmlOverrideChange?: (html: string | undefined) => void
}>(({
  htmlContent,
  values,
  onValuesChange,
  aiClauses,
  onAiClausesChange,
  contractDetails,
  existingHtmlOverride,
  onHtmlOverrideChange,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(800)
  const [activeAiZoneId, setActiveAiZoneId] = useState<string | null>(null)
  // Full document edit mode - user can toggle this to edit all text
  const [isFullDocumentEdit, setIsFullDocumentEdit] = useState(false)
  const isFullDocumentEditRef = useRef(isFullDocumentEdit)
  isFullDocumentEditRef.current = isFullDocumentEdit
  const valuesRef = useRef(values)
  valuesRef.current = values
  const aiClausesRef = useRef(aiClauses)
  aiClausesRef.current = aiClauses
  // Local ref for html override - used when exiting full edit mode before parent re-renders
  const localHtmlOverrideRef = useRef<string | undefined>(existingHtmlOverride)
  // Sync local ref when prop changes (e.g., after save/reload)
  if (existingHtmlOverride && existingHtmlOverride !== localHtmlOverrideRef.current) {
    localHtmlOverrideRef.current = existingHtmlOverride
  }

  // Debounced value change handler for slower devices
  // Batches rapid input changes to avoid excessive re-renders
  const pendingValuesRef = useRef<Record<string, string>>({})
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedValuesChange = useCallback((field: string, value: string) => {
    // Immediately update the ref so subsequent changes see the latest value
    pendingValuesRef.current = { ...valuesRef.current, ...pendingValuesRef.current, [field]: value }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    // Batch updates with a 50ms debounce - fast enough to feel responsive,
    // slow enough to batch rapid changes on slower devices
    debounceTimeoutRef.current = setTimeout(() => {
      const newVals = { ...valuesRef.current, ...pendingValuesRef.current }
      pendingValuesRef.current = {}
      onValuesChange(newVals)
    }, 50)
  }, [onValuesChange])

  // State for add content popover (Feature 3)
  const [addContentPopover, setAddContentPopover] = useState<{
    x: number
    y: number
    insertAfterElement: HTMLElement | null
  } | null>(null)
  const [showClauseInput, setShowClauseInput] = useState(false)
  const [clauseNumber, setClauseNumber] = useState('')

  // Selectors for block-level editing
  const EDITABLE_SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li, td, th'
  // Elements that should never be made contenteditable themselves
  const SKIP_EDIT_SELECTORS = '.ai-clause-zone-container, .ai-clause-btn, .add-content-btn'
  // Elements inside editable blocks that should be protected from deletion
  const PROTECTED_ELEMENTS = 'input, .inline-field-input, .inline-checkbox'

  // Enable block-level editing (Feature 2)
  const enableBlockEditing = (doc: Document) => {
    // Inject block editing styles
    const style = doc.createElement('style')
    style.id = 'block-edit-styles'
    style.textContent = `
      /* Force Times New Roman on ALL elements to prevent font change when editing */
      body, body *, p, span, div, b, i, strong, em, font,
      .editable-block, .editable-block * {
        font-family: 'Times New Roman', Times, serif !important;
      }
      /* Preserve font size and line height */
      .editable-block, .editable-block * {
        font-size: 11pt !important;
        line-height: 1.4 !important;
        color: #000 !important;
      }
      .editable-block {
        cursor: text;
        transition: outline 0.15s;
      }
      .editable-block:hover {
        outline: 1px dashed rgba(59, 130, 246, 0.4);
        outline-offset: 2px;
      }
      .editable-block:focus {
        outline: 2px solid rgba(59, 130, 246, 0.6);
        outline-offset: 2px;
        background: rgba(59, 130, 246, 0.03);
      }
      /* Make inputs inside editable blocks visually distinct and protected */
      .editable-block input,
      .editable-block .inline-field-input,
      .editable-block .inline-checkbox {
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
      }
      .add-content-btn {
        display: block;
        width: 100%;
        padding: 4px;
        margin: 4px 0;
        border: 1px dashed #ccc;
        background: transparent;
        color: #666;
        font-size: 12px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .add-content-btn:hover {
        opacity: 1;
        border-color: #3b82f6;
        color: #3b82f6;
      }
      body:has(.editable-block:focus) .add-content-btn,
      body:has(.editable-block:hover) .add-content-btn {
        opacity: 0.6;
      }
      body:has(.editable-block:focus) .add-content-btn:hover,
      body:has(.editable-block:hover) .add-content-btn:hover {
        opacity: 1;
      }
    `
    doc.head?.appendChild(style)

    // Make text blocks editable (including those with input fields)
    doc.querySelectorAll(EDITABLE_SELECTORS).forEach(el => {
      // Skip if is a container we don't want editable at all
      if (el.closest(SKIP_EDIT_SELECTORS)) return

      el.setAttribute('contenteditable', 'true')
      el.classList.add('editable-block')

      // Make any inputs inside non-editable so they can still be used
      el.querySelectorAll(PROTECTED_ELEMENTS).forEach(input => {
        input.setAttribute('contenteditable', 'false')
      })
    })

    // No deletion protection - let users edit freely
    // The font inheritance CSS above will maintain styling
  }

  // Disable block-level editing
  const disableBlockEditing = (doc: Document) => {
    // Remove block editing styles
    const style = doc.getElementById('block-edit-styles')
    if (style) style.remove()

    // Remove contenteditable and class from blocks
    doc.querySelectorAll('.editable-block').forEach(el => {
      el.removeAttribute('contenteditable')
      el.classList.remove('editable-block')
    })

    // Restore contenteditable on inputs that were set to false
    doc.querySelectorAll('[contenteditable="false"]').forEach(el => {
      el.removeAttribute('contenteditable')
    })

    // Remove add-content buttons
    doc.querySelectorAll('.add-content-btn').forEach(btn => btn.remove())
  }

  // Inject add-content buttons between blocks (Feature 3)
  const injectAddContentButtons = (doc: Document) => {
    const blocks = Array.from(doc.querySelectorAll('.editable-block'))

    blocks.forEach((block, index) => {
      const btn = doc.createElement('button')
      btn.className = 'add-content-btn'
      btn.setAttribute('data-insert-after', String(index))
      btn.textContent = '+ Add content here'
      btn.type = 'button'
      block.after(btn)
    })

    // Add button before first block too
    if (blocks[0]) {
      const btn = doc.createElement('button')
      btn.className = 'add-content-btn'
      btn.setAttribute('data-insert-before', '0')
      btn.textContent = '+ Add content here'
      btn.type = 'button'
      blocks[0].before(btn)
    }
  }

  // Insert new content at a position (Feature 3)
  const insertContent = (type: 'paragraph' | 'clause', clauseNum?: string) => {
    const iframe = iframeRef.current
    const doc = iframe?.contentDocument
    if (!doc || !addContentPopover) return

    const newEl = doc.createElement('p')
    newEl.className = 'paragraph editable-block'
    newEl.setAttribute('contenteditable', 'true')
    newEl.setAttribute('data-user-added', 'true')

    if (type === 'clause' && clauseNum) {
      newEl.innerHTML = `<strong>${clauseNum}.</strong> [Enter clause text]`
    } else {
      newEl.innerHTML = '[Enter text]'
    }

    // Insert after the trigger button
    addContentPopover.insertAfterElement?.after(newEl)

    // Focus and select placeholder
    newEl.focus()
    const sel = doc.getSelection()
    const range = doc.createRange()
    range.selectNodeContents(newEl)
    sel?.removeAllRanges()
    sel?.addRange(range)

    setAddContentPopover(null)
    setShowClauseInput(false)
    setClauseNumber('')

    // Resize iframe - use longer timeout for slower devices
    setTimeout(() => {
      if (doc.body) {
        setIframeHeight(Math.max(doc.body.scrollHeight + 40, 400))
      }
    }, 150)
  }

  // Count how many AI clause zones exist in the template
  const countAiZones = (): number => {
    let count = 0
    // Count {{#if ai_clauses}}...{{/if}} blocks
    const ifPattern = /\{\{#if\s+ai_clauses\}\}[\s\S]*?\{\{\/if\}\}/g
    let match
    while ((match = ifPattern.exec(htmlContent)) !== null) count++
    // Count standalone {{ai_clauses}} (not inside an #if block)
    const standalonePattern = /\{\{ai_clauses\}\}/g
    const stripped = htmlContent.replace(/\{\{#if\s+ai_clauses\}\}[\s\S]*?\{\{\/if\}\}/g, '')
    while ((match = standalonePattern.exec(stripped)) !== null) count++
    // Count <div class="ai-clause-zone"...>
    const divPattern = /<div[^>]*class="ai-clause-zone"[^>]*>[\s\S]*?<\/div>/g
    const stripped2 = stripped.replace(standalonePattern, '')
    while ((match = divPattern.exec(stripped2)) !== null) count++
    return count
  }
  const aiZoneCount = countAiZones()

  // Extract section number from a specific zone
  const extractSectionNumber = (zoneId?: string): string | undefined => {
    const match = htmlContent.match(/data-section="([^"]+)"/)
    if (match && match[1] !== 'auto') {
      return match[1]
    }
    return undefined
  }

  // Get clauses for a specific zone
  const getClausesForZone = (zoneId: string): AIClause[] => {
    return (aiClauses || []).filter(c => c.zoneId === zoneId || (!c.zoneId && zoneId === 'zone-0'))
  }

  // Handle clauses changing for a specific zone
  const handleZoneClausesChange = (zoneId: string, zoneClauses: AIClause[]) => {
    if (!onAiClausesChange) return
    // Tag new clauses with zoneId
    const tagged = zoneClauses.map(c => ({ ...c, zoneId }))
    // Replace clauses for this zone, keep others
    const otherClauses = (aiClauses || []).filter(c => c.zoneId !== zoneId && !(!c.zoneId && zoneId === 'zone-0'))
    const newClauses = [...otherClauses, ...tagged]

    // Update the ref immediately so setupIframe will have the latest clauses
    aiClausesRef.current = newClauses
    onAiClausesChange(newClauses)

    // Insert approved clauses into the iframe at this zone
    // If updateZoneInIframe fails (element not found), re-setup the iframe
    const success = updateZoneInIframe(zoneId, tagged)
    if (!success) {
      // Element not found - re-setup iframe to rebuild with latest clauses
      setupIframe()
    }
  }

  // Insert approved clause content into the iframe at a zone location
  // Returns true if successful, false if element not found
  const updateZoneInIframe = (zoneId: string, zoneClauses: AIClause[]): boolean => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return false
    const contentEl = iframe.contentDocument.querySelector(`[data-ai-zone-content="${zoneId}"]`)
    if (!contentEl) return false
    if (zoneClauses.length === 0) {
      contentEl.innerHTML = ''
      return true
    }
    const clauseHtml = zoneClauses.map((c, idx) => {
      const content = c.editedContent || c.content
      // Match the document's paragraph styling
      return `<p class="paragraph" style="text-align: justify; margin-bottom: 10pt; text-indent: 0.5in;">
        <strong>12.${6 + idx}</strong> <em>${c.title}.</em> ${content}
      </p>`
    }).join('')
    contentEl.innerHTML = clauseHtml
    // Resize iframe - use longer timeout for slower devices
    setTimeout(() => {
      if (iframe.contentDocument?.body) {
        setIframeHeight(Math.max(iframe.contentDocument.body.scrollHeight + 40, 400))
      }
    }, 150)
    return true
  }

  // Format monetary value with commas
  const formatMoney = (val: string): string => {
    const digits = val.replace(/[^\d.]/g, '')
    if (!digits) return ''
    const parts = digits.split('.')
    const whole = parseInt(parts[0], 10)
    if (isNaN(whole)) return ''
    const formatted = whole.toLocaleString('en-US')
    return parts.length > 1 ? `${formatted}.${parts[1]}` : formatted
  }

  const setupIframe = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const doc = iframe.contentDocument
    if (!doc) return

    // If there's an existing html_override and we're in full document edit mode, load it directly
    const fullEditHtmlOverride = localHtmlOverrideRef.current || existingHtmlOverride
    if (fullEditHtmlOverride && isFullDocumentEditRef.current) {
      doc.open()
      doc.write(fullEditHtmlOverride)
      doc.close()

      // Enable block-level editing instead of body-level contenteditable
      if (doc.body) {
        enableBlockEditing(doc)
        injectAddContentButtons(doc)
        // Set up click handler for add-content buttons
        doc.addEventListener('click', handleIframeAddContentClick)
      }

      // Set up height observer - use longer timeout for slower devices
      setTimeout(() => {
        if (doc.body) {
          setIframeHeight(Math.max(doc.body.scrollHeight + 40, 400))
        }
      }, 200)
      return
    }

    // Use html_override as base if it exists (preserves text customizations from full doc edit)
    // Otherwise use the template. Use local ref which may be more up-to-date than prop.
    const htmlOverride = localHtmlOverrideRef.current || existingHtmlOverride
    let processedHtml = htmlOverride || htmlContent

    // If using html_override, convert .field-value spans back to input fields
    if (htmlOverride && !isFullDocumentEditRef.current) {
      // Check how many field-value spans exist and how many have data-field attribute
      const fieldValueCount = (processedHtml.match(/class="field-value"/g) || []).length
      const withDataField = (processedHtml.match(/<span[^>]*class="field-value"[^>]*data-field="[^"]*"[^>]*>/g) || []).length
      const withDataField2 = (processedHtml.match(/<span[^>]*data-field="[^"]*"[^>]*class="field-value"[^>]*>/g) || []).length
      const totalWithDataField = withDataField + withDataField2

      // If NO spans have data-field, the html_override is from an old version
      // Fall back to using the template instead and clear the old html_override
      if (fieldValueCount > 0 && totalWithDataField === 0) {
        processedHtml = htmlContent
        // Clear the old html_override so user can re-do full document edits properly
        localHtmlOverrideRef.current = undefined
        if (onHtmlOverrideChange) {
          onHtmlOverrideChange(undefined)
        }
      }
      // The captureCleanHtml function replaces inputs with <span class="field-value" data-field="fieldname">value</span>
      // We need to convert these back to input fields

      // Convert field-value spans with data-field back to input fields
      // Helper function to create input from field info
      const createInputFromField = (field: string, value: string) => {
        const isDate = DATE_FIELDS.has(field)
        const isMoney = MONETARY_FIELDS.has(field) || field.includes('price') || field.includes('fee') || field.includes('cost') || field.includes('amount') || field.includes('deposit')
        const inputType = isDate ? 'date' : 'text'
        const label = field.replace(/_/g, ' ')
        // Update values ref with current value from html_override
        if (value && !valuesRef.current[field]) {
          valuesRef.current[field] = value
        }
        const currentVal = valuesRef.current[field] || value || ''
        return `<input type="${inputType}" ` +
          `data-field="${field}" ` +
          `data-monetary="${isMoney}" ` +
          `value="${currentVal.replace(/"/g, '&quot;')}" ` +
          `placeholder="${label}" ` +
          `title="${label}" ` +
          `class="inline-field-input" />`
      }

      // Pattern 1: class="field-value" comes before data-field
      processedHtml = processedHtml.replace(
        /<span[^>]*class="field-value"[^>]*data-field="([^"]*)"[^>]*>([^<]*)<\/span>/g,
        (match, field, value) => createInputFromField(field, value)
      )

      // Pattern 2: data-field comes before class="field-value"
      processedHtml = processedHtml.replace(
        /<span[^>]*data-field="([^"]*)"[^>]*class="field-value"[^>]*>([^<]*)<\/span>/g,
        (match, field, value) => createInputFromField(field, value)
      )

      // Convert checkbox spans back to checkbox inputs
      const createCheckboxInput = (checked: string | undefined, field: string) => {
        return `<input type="checkbox" ` +
          `data-field="${field}" ` +
          `${checked ? 'checked' : ''} ` +
          `class="inline-checkbox" />`
      }

      // Pattern 1: class before data-field
      processedHtml = processedHtml.replace(
        /<span[^>]*class="checkbox\s*(checked)?\s*"[^>]*data-field="([^"]*)"[^>]*><\/span>/g,
        (match, checked, field) => createCheckboxInput(checked, field)
      )

      // Pattern 2: data-field before class
      processedHtml = processedHtml.replace(
        /<span[^>]*data-field="([^"]*)"[^>]*class="checkbox\s*(checked)?\s*"[^>]*><\/span>/g,
        (match, field, checked) => createCheckboxInput(checked, field)
      )

    }

    // DEDUPLICATION: Remove ALL extra AI clause zones from html_override
    // Keep only the FIRST zone of each type, remove all others
    if (htmlOverride) {
      // Helper to find and deduplicate div containers by class pattern
      const deduplicateDivsByClass = (html: string, classPattern: RegExp): string => {
        let result = html
        let match
        const allContainers: Array<{start: number, end: number}> = []

        while ((match = classPattern.exec(html)) !== null) {
          const startIndex = match.index
          // Find matching closing </div> by counting
          let depth = 1
          let i = startIndex + match[0].length
          while (i < html.length && depth > 0) {
            if (html.substring(i, i + 4) === '<div') {
              depth++
              i += 4
            } else if (html.substring(i, i + 6) === '</div>') {
              depth--
              if (depth === 0) {
                allContainers.push({ start: startIndex, end: i + 6 })
              }
              i += 6
            } else {
              i++
            }
          }
        }

        // Keep only the FIRST container, remove ALL others
        if (allContainers.length > 1) {
          const toRemove = allContainers.slice(1)
          for (let j = toRemove.length - 1; j >= 0; j--) {
            const { start, end } = toRemove[j]
            result = result.substring(0, start) + result.substring(end)
          }
        }

        return result
      }

      // Deduplicate ai-clause-zone-container divs (already processed zones)
      processedHtml = deduplicateDivsByClass(
        processedHtml,
        /<div[^>]*class="ai-clause-zone-container"[^>]*>/g
      )

      // Also deduplicate raw ai-clause-zone divs (unprocessed zones)
      processedHtml = deduplicateDivsByClass(
        processedHtml,
        /<div[^>]*class="ai-clause-zone"[^>]*>/g
      )
    }

    // Replace AI clause zone markers with interactive buttons
    // IMPORTANT: Only create ONE zone button total to prevent duplicates
    let zoneCreated = false
    const usedZoneIds = new Set<string>()

    const makeAiZoneButton = (existingZoneId?: string) => {
      // If we already created a zone and this isn't regenerating an existing one, return empty
      if (zoneCreated && !existingZoneId) {
        return '' // Remove extra zone markers
      }

      const zoneId = existingZoneId || 'zone-0'

      // Mark that we've created a zone
      if (!existingZoneId) {
        zoneCreated = true
      }
      usedZoneIds.add(zoneId)
      const existingClauses = (aiClausesRef.current || []).filter(
        (c: AIClause) => c.zoneId === zoneId || (!c.zoneId && zoneId === 'zone-0')
      )
      const clauseHtml = existingClauses.length > 0
        ? existingClauses.map((c, idx) => {
            const content = c.editedContent || c.content
            // Match the document's paragraph styling
            return `<p class="paragraph" style="text-align: justify; margin-bottom: 10pt; text-indent: 0.5in;">
              <strong>12.${6 + idx}</strong> <em>${c.title}.</em> ${content}
            </p>`
          }).join('')
        : ''
      return `<div class="ai-clause-zone-container" data-zone-id="${zoneId}" style="margin: 12px 0;">
        <div data-ai-zone-content="${zoneId}">${clauseHtml}</div>
        <button class="ai-clause-btn" data-zone-id="${zoneId}" type="button">
          ✨ ${existingClauses.length > 0 ? 'Add More AI Clauses' : 'Generate AI Clauses'}
        </button>
      </div>`
    }

    // Replace {{#if ai_clauses}}...{{/if}} blocks
    processedHtml = processedHtml.replace(
      /\{\{#if\s+ai_clauses\}\}[\s\S]*?\{\{\/if\}\}/g,
      () => makeAiZoneButton()
    )
    // Replace standalone {{ai_clauses}} (not already handled by #if block)
    processedHtml = processedHtml.replace(
      /\{\{ai_clauses\}\}/g,
      () => makeAiZoneButton()
    )
    // Replace <div class="ai-clause-zone"...>...</div>
    processedHtml = processedHtml.replace(
      /<div[^>]*class="ai-clause-zone"[^>]*>[\s\S]*?<\/div>/g,
      () => makeAiZoneButton()
    )

    // Also handle existing ai-clause-zone-container divs from html_override
    // These may have been saved with or without button content, so regenerate them
    // Use a function to find and replace the containers since regex struggles with nested divs
    const regenerateAiZoneContainer = (html: string): string => {
      // Find all ai-clause-zone-container divs and regenerate them
      let result = html
      const containerStartPattern = /<div[^>]*class="ai-clause-zone-container"[^>]*data-zone-id="([^"]*)"[^>]*>/g
      let match
      const replacements: Array<{start: number, end: number, zoneId: string}> = []

      while ((match = containerStartPattern.exec(html)) !== null) {
        const startIndex = match.index
        const zoneId = match[1]
        // Find the matching closing </div> by counting div tags
        let depth = 1
        let i = startIndex + match[0].length
        while (i < html.length && depth > 0) {
          if (html.substring(i, i + 4) === '<div') {
            depth++
            i += 4
          } else if (html.substring(i, i + 6) === '</div>') {
            depth--
            if (depth === 0) {
              replacements.push({ start: startIndex, end: i + 6, zoneId })
            }
            i += 6
          } else {
            i++
          }
        }
      }

      // Replace from end to start to preserve indices
      // Use makeAiZoneButton with the existing zone ID to prevent duplicate IDs
      for (let j = replacements.length - 1; j >= 0; j--) {
        const { start, end, zoneId } = replacements[j]
        const newContent = makeAiZoneButton(zoneId)
        result = result.substring(0, start) + newContent + result.substring(end)
      }

      return result
    }

    processedHtml = regenerateAiZoneContainer(processedHtml)

    // Replace field-line placeholders with input elements
    // Pattern: <span class="field-line">{{placeholder}}</span>
    // Also handle: <span class="field-line short">{{placeholder}}</span> etc.
    processedHtml = processedHtml.replace(
      /<span class="field-line([^"]*)">\s*\{\{([^}]+)\}\}\s*<\/span>/g,
      (_, classes, key) => {
        const trimmedKey = key.trim()
        if (SKIP_INLINE_FIELDS.has(trimmedKey)) {
          return `<span class="field-line${classes}">${values[trimmedKey] || ''}</span>`
        }
        const currentVal = values[trimmedKey] || ''
        const isDate = DATE_FIELDS.has(trimmedKey)
        const isMoney = MONETARY_FIELDS.has(trimmedKey) || trimmedKey.includes('price') || trimmedKey.includes('fee') || trimmedKey.includes('cost') || trimmedKey.includes('amount') || trimmedKey.includes('deposit')
        const inputType = isDate ? 'date' : 'text'
        const label = trimmedKey.replace(/_/g, ' ')
        return `<span class="field-line${classes}" style="text-align:left;text-indent:0;">` +
          `<input type="${inputType}" ` +
          `data-field="${trimmedKey}" ` +
          `data-monetary="${isMoney}" ` +
          `value="${currentVal.replace(/"/g, '&quot;')}" ` +
          `placeholder="${label}" ` +
          `title="${label}" ` +
          `class="inline-field-input" ` +
          `style="text-align:left;" ` +
          `/></span>`
      }
    )

    // Replace standalone {{placeholders}} not inside field-line spans
    // (but skip checkbox placeholders which are in class attributes)
    processedHtml = processedHtml.replace(
      /\{\{([^}#/]+)\}\}/g,
      (match, key) => {
        const trimmedKey = key.trim()
        // Skip if it looks like a checkbox class placeholder (ends with _check)
        if (trimmedKey.endsWith('_check')) return match
        if (SKIP_INLINE_FIELDS.has(trimmedKey)) return values[trimmedKey] || ''
        const currentVal = values[trimmedKey] || ''
        const isDate = DATE_FIELDS.has(trimmedKey)
        const isMoney = MONETARY_FIELDS.has(trimmedKey) || trimmedKey.includes('price') || trimmedKey.includes('fee') || trimmedKey.includes('cost') || trimmedKey.includes('amount') || trimmedKey.includes('deposit')
        const inputType = isDate ? 'date' : 'text'
        const label = trimmedKey.replace(/_/g, ' ')
        return `<input type="${inputType}" ` +
          `data-field="${trimmedKey}" ` +
          `data-monetary="${isMoney}" ` +
          `value="${currentVal.replace(/"/g, '&quot;')}" ` +
          `placeholder="${label}" ` +
          `title="${label}" ` +
          `class="inline-field-input standalone" ` +
          `style="text-align:left;" />`
      }
    )

    // Replace checkbox placeholders in class attributes
    // Pattern: <span class="checkbox {{field_check}}"></span>
    processedHtml = processedHtml.replace(
      /<span class="checkbox\s+\{\{([^}]+)\}\}"\s*><\/span>/g,
      (_, key) => {
        const trimmedKey = key.trim()
        const isChecked = values[trimmedKey] === 'checked'
        return `<input type="checkbox" ` +
          `data-field="${trimmedKey}" ` +
          `${isChecked ? 'checked' : ''} ` +
          `class="inline-checkbox" />`
      }
    )

    // Also handle already-replaced checkbox classes (e.g., class="checkbox checked" or class="checkbox ")
    // These are checkboxes where the value was already interpolated but we want to make them editable
    processedHtml = processedHtml.replace(
      /<span class="checkbox\s*(checked)?\s*">\s*<\/span>/g,
      (_, checked) => {
        // No data-field key available for pre-interpolated checkboxes, skip these
        return `<span class="checkbox ${checked || ''}"></span>`
      }
    )

    // Inject custom styles for inline inputs
    const customStyles = `
      <style>
        .inline-field-input {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          color: inherit;
          border: none;
          border-bottom: 1px solid #000;
          background: rgba(59, 130, 246, 0.08);
          outline: none;
          padding: 0 2px;
          box-sizing: border-box;
          display: inline;
          width: auto;
          min-width: 80px;
        }
        /* Force left alignment on field-line spans to override paragraph justify */
        .field-line {
          text-align: left !important;
        }
        /* Inside field-line spans, fill the span width and remove padding (parent has padding) */
        .field-line .inline-field-input {
          display: inline-block;
          width: 100%;
          padding: 0;
          border-bottom: none;
          text-align: left !important;
        }
        /* Override any inherited text-align from parent paragraphs */
        .inline-field-input {
          text-align: left !important;
        }
        .inline-field-input:focus {
          background: rgba(59, 130, 246, 0.15);
          border-bottom-color: #3b82f6;
        }
        .inline-field-input:not(:placeholder-shown) {
          background: transparent;
        }
        .inline-field-input::placeholder {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.9em;
        }
        .inline-field-input.standalone {
          display: inline;
          width: auto;
          min-width: 100px;
        }
        .inline-field-input[type="date"] {
          width: auto;
          min-width: 140px;
        }
        .inline-checkbox {
          width: 10px;
          height: 10px;
          margin-right: 2px;
          vertical-align: middle;
          cursor: pointer;
          accent-color: #000;
        }
        /* AI Clause Zone Button */
        .ai-clause-btn {
          display: block;
          width: 100%;
          padding: 10px 16px;
          border: 2px dashed #a78bfa;
          border-radius: 8px;
          background: #f5f3ff;
          color: #6d28d9;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
          transition: background 0.15s, border-color 0.15s;
        }
        .ai-clause-btn:hover {
          background: #ede9fe;
          border-color: #7c3aed;
        }
        /* Hide the original body margin for continuous scroll */
        body {
          margin: 0.5in;
        }
      </style>
    `

    // Inject styles before </head>
    if (processedHtml.includes('</head>')) {
      processedHtml = processedHtml.replace('</head>', `${customStyles}</head>`)
    } else if (processedHtml.includes('<body')) {
      processedHtml = processedHtml.replace('<body', `${customStyles}<body`)
    }

    doc.open()
    doc.write(processedHtml)
    doc.close()

    // Set up event listeners - use both immediate and fallback strategies
    // to handle slower devices where content may not be ready immediately
    let listenersAttached = false
    const attachListeners = () => {
      if (listenersAttached) return
      const contentDoc = iframe.contentDocument
      if (!contentDoc?.body) return
      listenersAttached = true

      // Auto-resize iframe height
      const resizeObserver = new ResizeObserver(() => {
        const body = contentDoc.body
        if (body) {
          const newHeight = body.scrollHeight + 40
          setIframeHeight(Math.max(newHeight, 400))
        }
      })

      if (contentDoc.body) {
        resizeObserver.observe(contentDoc.body)
        // Initial sizing
        setIframeHeight(Math.max(contentDoc.body.scrollHeight + 40, 400))
      }

      // Listen for input changes on text fields
      // Uses debounced handler for better performance on slower devices
      contentDoc.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        if (target.classList.contains('inline-field-input')) {
          const fieldKey = target.getAttribute('data-field')
          if (fieldKey) {
            // Use debounced handler to batch rapid changes
            debouncedValuesChange(fieldKey, target.value)
          }
        }
      })

      // Handle blur for monetary formatting
      contentDoc.addEventListener('focusout', (e) => {
        const target = e.target as HTMLInputElement
        if (target.classList.contains('inline-field-input') &&
            target.getAttribute('data-monetary') === 'true') {
          const formatted = formatMoney(target.value)
          target.value = formatted
          const fieldKey = target.getAttribute('data-field')
          if (fieldKey) {
            const newVals = { ...valuesRef.current, [fieldKey]: formatted }
            onValuesChange(newVals)
          }
        }
      })

      // Listen for checkbox changes
      contentDoc.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement
        if (target.classList.contains('inline-checkbox')) {
          const fieldKey = target.getAttribute('data-field')
          if (fieldKey) {
            const newVals = {
              ...valuesRef.current,
              [fieldKey]: target.checked ? 'checked' : '',
            }
            onValuesChange(newVals)
          }
        }
      })

      // Listen for AI clause zone button clicks
      contentDoc.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('ai-clause-btn')) {
          const zoneId = target.getAttribute('data-zone-id')
          if (zoneId) {
            setActiveAiZoneId(zoneId)
            // Scroll the button into view
            target.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      })

      // Cleanup
      return () => resizeObserver.disconnect()
    }

    // Try attaching immediately (content is available after doc.close())
    attachListeners()
    // Also attach on load as fallback for slower browsers/devices
    iframe.addEventListener('load', attachListeners, { once: true })
    // Multiple fallback timeouts for slower devices
    // These are progressive fallbacks - if one succeeds, the rest are no-ops
    setTimeout(attachListeners, 100)   // Fast device fallback
    setTimeout(attachListeners, 500)   // Medium device fallback
    setTimeout(attachListeners, 1500)  // Slow device fallback
    setTimeout(attachListeners, 3000)  // Very slow device fallback
  }, [htmlContent, existingHtmlOverride, debouncedValuesChange]) // Re-setup when template HTML or html_override changes

  useEffect(() => {
    setupIframe()
  }, [setupIframe])

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  // Capture clean HTML from the iframe (replacing inputs with their values)
  const captureCleanHtml = (): string | null => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument) return null

    // Get the current HTML and clean it up using string manipulation
    let html = iframe.contentDocument.documentElement.outerHTML

    // Remove editor-specific style blocks (both old full-edit-styles and new block-edit-styles)
    html = html.replace(/<style id="full-edit-styles">[\s\S]*?<\/style>/g, '')
    html = html.replace(/<style id="block-edit-styles">[\s\S]*?<\/style>/g, '')

    // Remove add-content buttons
    html = html.replace(/<button[^>]*class="add-content-btn"[^>]*>[\s\S]*?<\/button>/g, '')

    // Remove contenteditable and editable-block class from elements
    html = html.replace(/(<body[^>]*)\s+contenteditable="true"/g, '$1')
    html = html.replace(/(<body[^>]*)\s+style="[^"]*cursor:\s*text[^"]*"/g, '$1')
    // Remove contenteditable from individual blocks
    html = html.replace(/\s+contenteditable="true"/g, '')
    // Remove editable-block class
    html = html.replace(/\s+class="([^"]*)\s*editable-block\s*([^"]*)"/g, (match, before, after) => {
      const remaining = (before + ' ' + after).trim()
      return remaining ? ` class="${remaining}"` : ''
    })
    html = html.replace(/\s+class="editable-block\s*([^"]*)"/g, (match, after) => {
      const remaining = after.trim()
      return remaining ? ` class="${remaining}"` : ''
    })
    html = html.replace(/\s+class="([^"]*)\s*editable-block"/g, (match, before) => {
      const remaining = before.trim()
      return remaining ? ` class="${remaining}"` : ''
    })

    // Replace input fields with their values
    // First, collect all input values from the live DOM
    const inputValues: Record<string, string> = {}
    iframe.contentDocument.querySelectorAll('.inline-field-input').forEach((input) => {
      const field = input.getAttribute('data-field')
      if (field) {
        inputValues[field] = (input as HTMLInputElement).value
      }
    })

    // Replace input elements with spans containing the values
    // Preserve data-field attribute so we can convert back to inputs later
    // Use a single flexible regex that matches inputs with both class and data-field in any order
    html = html.replace(
      /<input[^>]*data-field="([^"]*)"[^>]*class="inline-field-input[^"]*"[^>]*\/?>/g,
      (match, field) => {
        const value = inputValues[field] || ''
        return `<span class="field-value" data-field="${field}">${value}</span>`
      }
    )
    // Also handle the reverse order (class before data-field)
    html = html.replace(
      /<input[^>]*class="inline-field-input[^"]*"[^>]*data-field="([^"]*)"[^>]*\/?>/g,
      (match, field) => {
        const value = inputValues[field] || ''
        return `<span class="field-value" data-field="${field}">${value}</span>`
      }
    )


    // Replace checkboxes
    const checkboxValues: Record<string, boolean> = {}
    iframe.contentDocument.querySelectorAll('.inline-checkbox').forEach((input) => {
      const field = input.getAttribute('data-field')
      if (field) {
        checkboxValues[field] = (input as HTMLInputElement).checked
      }
    })

    // Pattern 1: class before data-field
    html = html.replace(
      /<input[^>]*class="inline-checkbox"[^>]*data-field="([^"]*)"[^>]*\/?>/g,
      (match, field) => {
        const checked = checkboxValues[field] || false
        return `<span class="checkbox ${checked ? 'checked' : ''}" data-field="${field}"></span>`
      }
    )
    // Pattern 2: data-field before class (this is how checkboxes are created)
    html = html.replace(
      /<input[^>]*data-field="([^"]*)"[^>]*class="inline-checkbox"[^>]*\/?>/g,
      (match, field) => {
        const checked = checkboxValues[field] || false
        return `<span class="checkbox ${checked ? 'checked' : ''}" data-field="${field}"></span>`
      }
    )

    // Remove AI clause buttons
    html = html.replace(/<button[^>]*class="ai-clause-btn"[^>]*>[\s\S]*?<\/button>/g, '')

    // Clean up browser-added font styling that contenteditable may have inserted
    // Remove <font> tags but keep their content
    html = html.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1')

    // Remove font-family from inline style attributes only (safer approach)
    // Match style="...font-family:...;" and remove just the font-family part
    html = html.replace(/(style="[^"]*?)font-family:\s*[^;]+;?\s*/gi, '$1')

    // Remove empty style attributes left behind
    html = html.replace(/\s+style="\s*"/g, '')
    html = html.replace(/\s+style=''/g, '')

    return html
  }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    captureHtmlOverride: captureCleanHtml,
    isInFullEditMode: () => isFullDocumentEditRef.current,
  }))

  // Toggle full document edit mode
  const toggleFullDocumentEdit = () => {
    const newMode = !isFullDocumentEdit
    setIsFullDocumentEdit(newMode)

    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return

    if (newMode) {
      // If there's an existing html_override, load it into the iframe
      if (existingHtmlOverride) {
        const doc = iframe.contentDocument
        doc.open()
        doc.write(existingHtmlOverride)
        doc.close()
      }

      // Enable block-level editing instead of body-level contenteditable
      enableBlockEditing(iframe.contentDocument)
      injectAddContentButtons(iframe.contentDocument)

      // Set up click handler for add-content buttons
      iframe.contentDocument.addEventListener('click', handleIframeAddContentClick)
    } else {
      // Close any open popover
      setAddContentPopover(null)
      setShowClauseInput(false)
      setClauseNumber('')

      // Disable block-level editing
      disableBlockEditing(iframe.contentDocument)

      // Remove click handler
      iframe.contentDocument.removeEventListener('click', handleIframeAddContentClick)

      // Capture the edited HTML (cleaned) and notify parent
      const cleanHtml = captureCleanHtml()
      if (cleanHtml) {
        // Update local ref so setupIframe uses the latest HTML
        localHtmlOverrideRef.current = cleanHtml
        // Also notify parent
        if (onHtmlOverrideChange) {
          onHtmlOverrideChange(cleanHtml)
        }
      }

      // Update the ref BEFORE calling setupIframe so it knows we're exiting full edit mode
      isFullDocumentEditRef.current = false

      // Reload the template with input fields
      setupIframe()
    }
  }

  // Handle click on add-content buttons in iframe
  const handleIframeAddContentClick = (e: Event) => {
    const target = e.target as HTMLElement
    if (target.classList.contains('add-content-btn')) {
      const iframe = iframeRef.current
      if (!iframe) return

      const rect = target.getBoundingClientRect()
      const iframeRect = iframe.getBoundingClientRect()
      setAddContentPopover({
        x: iframeRect.left + rect.left,
        y: iframeRect.top + rect.bottom + 4,
        insertAfterElement: target,
      })
      setShowClauseInput(false)
      setClauseNumber('')
    }
  }

  return (
    <div className="space-y-4">
      {/* Reset to Template button - only shown if there's a saved html_override */}
      {existingHtmlOverride && (
        <div className="flex items-center justify-end bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-lg px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset document to original template? This will undo all text edits (field values will be preserved).')) {
                localHtmlOverrideRef.current = undefined
                onHtmlOverrideChange?.(undefined)
                setupIframe()
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-white border border-[var(--gray-300)] text-[var(--gray-600)] hover:bg-[var(--gray-100)] hover:text-[var(--error-600)]"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Template
          </button>
        </div>
      )}

      <div className="border border-[var(--gray-200)] rounded bg-white overflow-hidden">
        <iframe
          ref={iframeRef}
          style={{
            width: '100%',
            height: `${iframeHeight}px`,
            border: 'none',
            display: 'block',
          }}
          sandbox="allow-same-origin"
          title="Contract Editor"
        />
      </div>

      {/* AI Clause Zone Modal - shown when user clicks a zone button in the document */}
      <Dialog open={!!activeAiZoneId} onOpenChange={(open) => !open && setActiveAiZoneId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--primary-700)]" />
              Generate AI Clauses
            </DialogTitle>
          </DialogHeader>
          {activeAiZoneId && aiClauses !== undefined && onAiClausesChange && contractDetails && (
            <InlineAIClauseZone
              key={activeAiZoneId}
              contractDetails={contractDetails}
              clauses={getClausesForZone(activeAiZoneId)}
              onClausesChange={(newClauses) => handleZoneClausesChange(activeAiZoneId, newClauses)}
              startingSection={extractSectionNumber(activeAiZoneId)}
              onClose={() => setActiveAiZoneId(null)}
              inModal={true}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
})

InlineDocumentEditor.displayName = 'InlineDocumentEditor'

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string; bgColor: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'var(--gray-700)', bgColor: 'var(--gray-100)' },
  ready: { label: 'Ready to Send', icon: CheckCircle, color: 'var(--primary-700)', bgColor: 'var(--primary-100)' },
  sent: { label: 'Sent', icon: Send, color: 'var(--info-700)', bgColor: 'var(--info-100)' },
  viewed: { label: 'Viewed', icon: Eye, color: 'var(--warning-700)', bgColor: 'var(--warning-100)' },
  seller_signed: { label: 'Seller Signed', icon: CheckCircle, color: 'var(--success-700)', bgColor: 'var(--success-100)' },
  buyer_pending: { label: 'Awaiting Buyer', icon: Clock, color: 'var(--info-700)', bgColor: 'var(--info-100)' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'var(--success-700)', bgColor: 'var(--success-100)' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'var(--error-700)', bgColor: 'var(--error-100)' },
}

/**
 * Safari-friendly fetch wrapper
 * - Adds credentials for cookie handling
 * - Adds timeout to prevent hanging requests
 * - Sanitizes JSON body to remove undefined values
 */
async function safariFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    // Sanitize body - remove undefined values that can cause issues in Safari
    let body = options.body
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body)
        // Remove undefined values recursively
        const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
          const result: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                result[key] = sanitize(value as Record<string, unknown>)
              } else {
                result[key] = value
              }
            }
          }
          return result
        }
        body = JSON.stringify(sanitize(parsed))
      } catch {
        // Not valid JSON, use as-is
      }
    }

    const response = await fetch(url, {
      ...options,
      body,
      credentials: 'same-origin', // Important for Safari cookie handling
      signal: controller.signal,
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const justSigned = searchParams.get('signed') === 'true'

  const [contract, setContract] = useState<Contract | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [history, setHistory] = useState<StatusHistoryItem[]>([])
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const inlineEditorRef = useRef<InlineDocumentEditorRef>(null)
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
  const [inlineValues, setInlineValues] = useState<Record<string, string>>({})
  const inlineIframeRef = useRef<HTMLIFrameElement>(null)
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw')
  const [typedSignature, setTypedSignature] = useState('')
  const [initialsMode, setInitialsMode] = useState<'draw' | 'type'>('draw')
  const [typedInitials, setTypedInitials] = useState('')
  const signatureRef = useRef<SignatureCanvas>(null)
  const initialsRef = useRef<SignatureCanvas>(null)

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

  // Editable signer info - can differ from contract values
  const [sendToSellerName, setSendToSellerName] = useState('')
  const [sendToSellerEmail, setSendToSellerEmail] = useState('')
  const [sendToSellerPhone, setSendToSellerPhone] = useState('')
  const [sendToSellerAddress, setSendToSellerAddress] = useState('')
  const [sendToAssigneeName, setSendToAssigneeName] = useState('')
  const [sendToAssigneeEmail, setSendToAssigneeEmail] = useState('')
  const [sendToAssigneePhone, setSendToAssigneePhone] = useState('')
  const [sendToAssigneeAddress, setSendToAssigneeAddress] = useState('')

  // Recipient signing status from Documenso
  const [recipientStatuses, setRecipientStatuses] = useState<Array<{
    id: number
    email: string
    name: string
    role: string
    signingStatus: 'NOT_SIGNED' | 'SIGNED'
    signedAt?: string
  }>>([])
  const [statusLoading, setStatusLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [savingBuyerInfo, setSavingBuyerInfo] = useState(false)
  const [notifyingManager, setNotifyingManager] = useState(false)
  const [savingSignature, setSavingSignature] = useState(false)
  const [isResigning, setIsResigning] = useState(false)
  const [savingSignerInfo, setSavingSignerInfo] = useState(false)

  useEffect(() => {
    fetchContract()
    fetchUsageInfo()
  }, [id])

  const fetchContract = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`, { credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error('Contract not found')
      }
      const data = await res.json()
      setContract(data.contract)
      setHistory(data.history || [])
      setTemplate(data.template || null)
      setIsManager(data.isManager || false)
      // Initialize send-to info from contract values
      setSendToSellerName(data.contract.seller_name || '')
      setSendToSellerEmail(data.contract.seller_email || '')
      setSendToSellerPhone(data.contract.custom_fields?.seller_phone || '')
      setSendToSellerAddress(data.contract.custom_fields?.seller_address || '')
      setSendToAssigneeName(data.contract.buyer_name || '')
      setSendToAssigneeEmail(data.contract.buyer_email || '')
      setSendToAssigneePhone(data.contract.custom_fields?.buyer_phone || '')
      setSendToAssigneeAddress(data.contract.custom_fields?.assignee_address || '')
      // Initialize signature fields for the standalone signature section
      setFormData(prev => ({
        ...prev,
        company_name: data.contract.custom_fields?.company_name || '',
        company_signer_name: data.contract.custom_fields?.company_signer_name || '',
        company_email: data.contract.custom_fields?.company_email || '',
        company_phone: data.contract.custom_fields?.company_phone || '',
        buyer_signature: data.contract.custom_fields?.buyer_signature || '',
        buyer_initials: data.contract.custom_fields?.buyer_initials || '',
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contract')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsageInfo = async () => {
    try {
      const res = await fetch('/api/settings', { credentials: 'same-origin' })
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

  const fetchRecipientStatus = async () => {
    if (!contract?.documenso_document_id) return
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/contracts/${id}/status`, { credentials: 'same-origin' })
      if (res.ok) {
        const data = await res.json()
        setRecipientStatuses(data.recipients || [])
      }
    } catch (err) {
      console.error('Failed to fetch recipient status:', err)
    } finally {
      setStatusLoading(false)
    }
  }

  const handleResend = async () => {
    if (!contract?.documenso_document_id) return
    setResending(true)
    try {
      const res = await fetch(`/api/contracts/${id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message || 'Signing request resent successfully')
      } else {
        alert(data.error || 'Failed to resend')
      }
    } catch (err) {
      console.error('Failed to resend contract:', err)
      alert('Failed to resend contract')
    } finally {
      setResending(false)
    }
  }

  // Fetch recipient status when contract is sent/viewed
  useEffect(() => {
    if (contract && (contract.status === 'sent' || contract.status === 'viewed')) {
      fetchRecipientStatus()
    }
  }, [contract?.status, contract?.documenso_document_id])

  // Core required fields that are ALWAYS visible (needed for contract creation/update API)
  const ALWAYS_VISIBLE_FIELDS = [
    'property_address', 'property_city', 'property_state', 'property_zip',
    'seller_name', 'seller_email', 'purchase_price', 'price',
  ]

  // Field visibility helpers - based on template's field_config.standardFields
  const isFieldVisible = (fieldName: string): boolean => {
    // Core required fields are always visible regardless of template config
    if (ALWAYS_VISIBLE_FIELDS.includes(fieldName)) {
      return true
    }
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

  // Check if this is a two-stage contract (three-party or two-seller)
  const isTwoSeller = template?.signature_layout === 'two-seller'
  const isThreeParty = isTwoSeller || template?.signature_layout === 'three-party' ||
    contract?.custom_fields?.contract_type === 'three-party' ||
    contract?.custom_fields?.contract_type === 'assignment'
  const isAssignment = template?.signature_layout === 'two-column-assignment'
  const sellerLabel = isAssignment ? 'Assignee' : 'Seller'

  // Validate email format
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Check if we can send (names, emails, and signature are required)
  const canSend = () => {
    console.log('[canSend] Checking requirements:', {
      hasSignature: !!contract?.custom_fields?.buyer_signature,
      hasInitials: !!contract?.custom_fields?.buyer_initials,
      sellerName: sendToSellerName,
      sellerEmail: sendToSellerEmail,
      isThreeParty,
      assigneeName: sendToAssigneeName,
      assigneeEmail: sendToAssigneeEmail,
    })
    // Wholesaler signature required
    if (!contract?.custom_fields?.buyer_signature) {
      console.log('[canSend] BLOCKED: Missing signature')
      return false
    }
    // Initials only required for two-party/two-column contracts (not three-party)
    if (!isThreeParty && !contract?.custom_fields?.buyer_initials) {
      console.log('[canSend] BLOCKED: Missing initials (required for two-party)')
      return false
    }
    // Seller name and email required
    if (!sendToSellerName.trim()) {
      console.log('[canSend] BLOCKED: Missing seller name')
      return false
    }
    if (!sendToSellerEmail || !isValidEmail(sendToSellerEmail)) {
      console.log('[canSend] BLOCKED: Invalid seller email')
      return false
    }
    // For three-party, all assignee info also required
    if (isThreeParty) {
      if (!sendToAssigneeName.trim()) {
        console.log('[canSend] BLOCKED: Missing assignee name')
        return false
      }
      if (!sendToAssigneeEmail || !isValidEmail(sendToAssigneeEmail)) {
        console.log('[canSend] BLOCKED: Invalid assignee email')
        return false
      }
    }
    console.log('[canSend] All requirements met!')
    return true
  }

  // Check if overage warning needed before sending
  const inititateSend = (type: 'purchase' | 'assignment') => {
    // Validate wholesaler signature first
    if (!contract?.custom_fields?.buyer_signature) {
      setError('Wholesaler signature is required before sending.')
      return
    }
    // Initials only required for two-party/two-column contracts
    if (!isThreeParty && !contract?.custom_fields?.buyer_initials) {
      setError('Wholesaler initials are required before sending.')
      return
    }
    // Validate all seller info
    if (!sendToSellerName.trim()) {
      setError('Please enter the seller name before sending.')
      return
    }
    if (!sendToSellerEmail || !isValidEmail(sendToSellerEmail)) {
      setError('Please enter a valid seller email address before sending.')
      return
    }
    // For three-party, also require all assignee/buyer info
    if (isThreeParty) {
      if (!sendToAssigneeName.trim()) {
        setError(`Please enter the ${isTwoSeller ? 'Seller 2' : 'buyer/assignee'} name before sending.`)
        return
      }
      if (!sendToAssigneeEmail || !isValidEmail(sendToAssigneeEmail)) {
        setError(`Please enter a valid ${isTwoSeller ? 'Seller 2' : 'buyer/assignee'} email address before sending.`)
        return
      }
    }

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

  const handleSend = async (type: 'purchase' | 'assignment' = 'purchase', sendTo?: 'seller' | 'buyer') => {
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type,
          sendTo, // For three-party: 'seller' or 'buyer'
          // Use editable signer info (can differ from contract values)
          sellerName: sendToSellerName,
          sellerEmail: sendToSellerEmail,
          sellerPhone: sendToSellerPhone,
          sellerAddress: sendToSellerAddress,
          assigneeName: sendToAssigneeName,
          assigneeEmail: sendToAssigneeEmail,
          assigneePhone: sendToAssigneePhone,
          assigneeAddress: sendToAssigneeAddress,
        }),
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
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE', credentials: 'same-origin' })

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
      // Open preview in new tab (timestamp busts browser cache)
      window.open(`/api/contracts/${id}/preview?type=${type}&t=${Date.now()}`, '_blank')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  // Save buyer email (only changes where the signing request is sent, not the document)
  const handleSaveBuyerInfo = async () => {
    if (!contract) return

    setSavingBuyerInfo(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          buyer_email: sendToAssigneeEmail,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save email')
      }

      // Refresh contract data
      await fetchContract()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save email')
    } finally {
      setSavingBuyerInfo(false)
    }
  }

  // Notify manager that contract needs signature
  const handleNotifyManager = async () => {
    setNotifyingManager(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${id}/notify-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to notify manager')
      }

      alert(data.message || 'Manager has been notified!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to notify manager')
    } finally {
      setNotifyingManager(false)
    }
  }

  // Save signature from the standalone signature section
  const handleSaveSignatureOnly = async () => {
    if (!contract) return
    setSavingSignature(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          custom_fields: {
            ...contract.custom_fields,
            company_name: formData.company_name,
            company_signer_name: formData.company_signer_name,
            company_email: formData.company_email,
            company_phone: formData.company_phone,
            buyer_signature: formData.buyer_signature,
            buyer_initials: formData.buyer_initials,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save signature')
      }

      await fetchContract()
      setIsResigning(false) // Reset re-signing mode after successful save
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature')
    } finally {
      setSavingSignature(false)
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

    // Initialize inline values from existing contract data for inline editor
    if (template?.html_content) {
      const vals: Record<string, string> = {}
      // Map standard contract fields
      if (contract.seller_name) vals.seller_name = contract.seller_name
      if (contract.seller_email) vals.seller_email = contract.seller_email
      if (contract.buyer_name) vals.buyer_name = contract.buyer_name
      if (contract.buyer_email) vals.buyer_email = contract.buyer_email
      if (contract.price) vals.purchase_price = contract.price.toLocaleString('en-US')

      // Build full property address
      const pa = contract.custom_fields?.property_address || contract.property?.address || ''
      const pc = contract.custom_fields?.property_city || contract.property?.city || ''
      const ps = contract.custom_fields?.property_state || contract.property?.state || ''
      const pz = contract.custom_fields?.property_zip || contract.property?.zip || ''
      if (pa) vals.property_address = pa
      if (pc) vals.property_city = pc
      if (ps) vals.property_state = ps
      if (pz) vals.property_zip = pz
      if (pa && pc) vals.full_property_address = `${pa}, ${pc}, ${ps} ${pz}`

      // Map custom_fields
      const cf = contract.custom_fields || {}
      const standardContractKeys = new Set([
        'ai_clauses', 'company_template_id', 'admin_template_id',
        'purchase_template_id', 'assignment_template_id', 'contract_type',
        'buyer_signature', 'buyer_initials',
        'documenso_seller_document_id', 'documenso_buyer_document_id', 'seller_signed_at',
      ])
      for (const [key, value] of Object.entries(cf)) {
        if (standardContractKeys.has(key)) continue
        if (value != null && typeof value !== 'object') {
          vals[key] = String(value)
        }
      }

      // Map assignee fields (three-party templates use assignee_* but form stores as buyer_*)
      if (contract.buyer_name) vals.assignee_name = contract.buyer_name
      if (contract.buyer_email) vals.assignee_email = contract.buyer_email
      if (cf.buyer_phone) vals.assignee_phone = String(cf.buyer_phone)
      if (cf.assignee_address) vals.assignee_address = String(cf.assignee_address)

      setInlineValues(vals)
    }

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
        credentials: 'same-origin',
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

  // Save handler for inline document editor
  const handleInlineSave = async () => {
    setSaving(true)
    setError(null)

    const parseCurrency = (value: string) => {
      const num = parseFloat(value.replace(/,/g, ''))
      return isNaN(num) ? undefined : num
    }

    try {
      // Wait a moment for any pending debounced input changes to flush
      // This ensures slow devices have time to propagate all changes
      await new Promise(resolve => setTimeout(resolve, 100))

      // Safety net: read current values directly from iframe inputs
      // in case event listeners didn't propagate changes to inlineValues
      const currentValues = { ...inlineValues }
      const iframeEl = document.querySelector('iframe[title="Contract Editor"]') as HTMLIFrameElement
      if (iframeEl?.contentDocument) {
        iframeEl.contentDocument.querySelectorAll('.inline-field-input').forEach((el) => {
          const fieldKey = el.getAttribute('data-field')
          if (fieldKey) {
            currentValues[fieldKey] = (el as HTMLInputElement).value
          }
        })
        iframeEl.contentDocument.querySelectorAll('.inline-checkbox').forEach((el) => {
          const fieldKey = el.getAttribute('data-field')
          if (fieldKey) {
            currentValues[fieldKey] = (el as HTMLInputElement).checked ? 'checked' : ''
          }
        })
      }

      // Separate inline values into contract-level fields vs custom_fields
      const contractLevelMap: Record<string, string> = {
        seller_name: 'seller_name',
        seller_email: 'seller_email',
        buyer_name: 'buyer_name',
        buyer_email: 'buyer_email',
      }
      // Assignee fields map to contract-level buyer fields
      const assigneeToContractMap: Record<string, string> = {
        assignee_name: 'buyer_name',
        assignee_email: 'buyer_email',
      }

      const customFieldsMap: Record<string, string> = {
        seller_phone: 'seller_phone',
        seller_address: 'seller_address',
        buyer_phone: 'buyer_phone',
        assignee_phone: 'buyer_phone',
        assignee_address: 'assignee_address',
        property_address: 'property_address',
        property_city: 'property_city',
        property_state: 'property_state',
        property_zip: 'property_zip',
        apn: 'apn',
        escrow_agent_name: 'escrow_agent_name',
        escrow_agent_address: 'escrow_agent_address',
        escrow_officer: 'escrow_officer',
        escrow_agent_email: 'escrow_agent_email',
        close_of_escrow: 'close_of_escrow',
        inspection_period: 'inspection_period',
        personal_property: 'personal_property',
        additional_terms: 'additional_terms',
      }

      const numericCustomFields = new Set([
        'earnest_money', 'assignment_fee',
      ])

      const body: Record<string, unknown> = {}
      const newCustomFields: Record<string, unknown> = { ...contract?.custom_fields }

      for (const [key, value] of Object.entries(currentValues)) {
        if (contractLevelMap[key]) {
          body[contractLevelMap[key]] = value
        } else if (assigneeToContractMap[key]) {
          body[assigneeToContractMap[key]] = value
        } else if (key === 'purchase_price') {
          body.price = parseCurrency(value) || 0
        } else if (customFieldsMap[key]) {
          newCustomFields[customFieldsMap[key]] = value
        } else if (numericCustomFields.has(key)) {
          newCustomFields[key] = parseCurrency(value)
        } else if (key === 'full_property_address' || key === 'contract_date' ||
                   key === 'buyer_signature_img' || key === 'buyer_initials_img' ||
                   key === 'ai_clauses' || key === 'company_name' ||
                   key === 'company_full_address' || key === 'company_signer_name' ||
                   key === 'company_email' || key === 'company_phone') {
          // Skip computed/auto-generated fields, company fields handled separately
          if (key === 'company_name' || key === 'company_signer_name' ||
              key === 'company_email' || key === 'company_phone') {
            newCustomFields[key] = value
          }
        } else {
          // Non-standard field — store as-is in custom_fields
          newCustomFields[key] = value
        }
      }

      // Add AI clauses if present
      newCustomFields.ai_clauses = aiClauses

      // Capture html_override if in full document edit mode
      if (inlineEditorRef.current?.isInFullEditMode()) {
        const capturedHtml = inlineEditorRef.current.captureHtmlOverride()
        if (capturedHtml) {
          newCustomFields.html_override = capturedHtml
        }
      } else {
        // Not in full edit mode - clear any old html_override that doesn't have proper field markup
        // This ensures old-format overrides get cleared when saving in regular edit mode
        delete newCustomFields.html_override
      }

      body.custom_fields = newCustomFields

      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
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

  const handleSaveSignerInfo = async () => {
    setSavingSignerInfo(true)
    setError(null)

    const payload = {
      seller_name: sendToSellerName.trim(),
      seller_email: sendToSellerEmail.trim(),
      buyer_name: isThreeParty ? sendToAssigneeName.trim() : contract?.buyer_name,
      buyer_email: isThreeParty ? sendToAssigneeEmail.trim() : contract?.buyer_email,
      custom_fields: {
        ...contract?.custom_fields,
        seller_phone: sendToSellerPhone.trim(),
        seller_address: sendToSellerAddress.trim(),
        buyer_phone: isThreeParty ? sendToAssigneePhone.trim() : contract?.custom_fields?.buyer_phone,
        assignee_address: isThreeParty ? sendToAssigneeAddress.trim() : contract?.custom_fields?.assignee_address,
      },
    }

    console.log('[Save Signer Info] Saving payload:', payload)

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })

      console.log('[Save Signer Info] Response status:', res.status)

      if (!res.ok) {
        const data = await res.json()
        console.log('[Save Signer Info] Error response:', data)
        throw new Error(data.error || 'Failed to save signer information')
      }

      const result = await res.json()
      console.log('[Save Signer Info] Success:', result)

      await fetchContract()
      alert('Signer information saved successfully!')
    } catch (err) {
      console.error('[Save Signer Info] Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save signer information')
    } finally {
      setSavingSignerInfo(false)
    }
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
  const secondSignerLabel = isTwoSeller ? 'Seller 2' : 'Assignee'

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
                    onClick={template?.html_content ? handleInlineSave : handleSave}
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
                template?.html_content ? (
                  /* Inline Document Editor for admin templates */
                  <InlineDocumentEditor
                    ref={inlineEditorRef}
                    htmlContent={template.html_content}
                    values={inlineValues}
                    onValuesChange={setInlineValues}
                    aiClauses={aiClauses}
                    onAiClausesChange={setAiClauses}
                    contractDetails={{
                      property_address: inlineValues.property_address || formData.property_address,
                      property_city: inlineValues.property_city || formData.property_city,
                      property_state: inlineValues.property_state || formData.property_state,
                      property_zip: inlineValues.property_zip || formData.property_zip,
                      price: inlineValues.purchase_price || formData.price,
                      seller_name: inlineValues.seller_name || formData.seller_name,
                      close_of_escrow: inlineValues.close_of_escrow || formData.close_of_escrow,
                      inspection_period: inlineValues.inspection_period || formData.inspection_period,
                    }}
                    existingHtmlOverride={contract?.custom_fields?.html_override}
                    onHtmlOverrideChange={(html) => {
                      // Update the contract's html_override in state
                      if (contract) {
                        setContract({
                          ...contract,
                          custom_fields: {
                            ...contract.custom_fields,
                            html_override: html,
                          }
                        })
                      }
                    }}
                  />
                ) : (
                /* Traditional Edit Mode */
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
                                <Input
                                  value={formData.property_state}
                                  onChange={(e) => updateField('property_state', e.target.value)}
                                  placeholder="FL"
                                />
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
                        {isAssignment ? 'Assignee' : 'Seller (Property Owner)'}
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
                              placeholder={isAssignment ? "assignee@email.com" : "seller@email.com"}
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
                              placeholder={isAssignment ? "Assignee's mailing address" : "Seller's mailing address"}
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
                        {isTwoSeller ? 'Seller 2' : isThreeParty ? 'Assignee (End Buyer)' : 'End Buyer (for Assignment)'}
                      </h3>
                      <p className="text-xs text-[var(--gray-500)] mb-3">
                        {isTwoSeller
                          ? 'Required for two-seller purchase agreements'
                          : isThreeParty
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
                                Signing document will be sent here via Documenso (Signs 2nd, after {isTwoSeller ? 'Seller 1' : 'Seller'})
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
                  {isGroupVisible(['purchase_price', 'price', 'earnest_money', 'assignment_fee']) && (
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[var(--gray-400)]" />
                        Pricing
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {(isFieldVisible('purchase_price') || isFieldVisible('price')) && (
                          <div>
                            <Label className="text-xs text-[var(--gray-600)]">
                              Purchase Price {(isFieldRequired('purchase_price') || isFieldRequired('price')) && '*'}
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
                      <h3 className="text-sm font-semibold text-[var(--gray-900)] mb-3">Closing Amounts</h3>
                      <p className="text-xs text-[var(--gray-500)] mb-3">Check one option for each, or leave unchecked</p>
                      <div className="space-y-4">
                        {/* Escrow Fees */}
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

                        {/* Title Policy */}
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

                        {/* HOA Fees */}
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
                )
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

                  {/* Seller / Assignee */}
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-[var(--gray-400)] mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--gray-700)]">{sellerLabel}</p>
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

          {/* Wholesaler Signature Section - Between Contract Details and Timeline */}
          {(contract.status === 'draft' || contract.status === 'ready') && (
            <div className="bg-white border border-[var(--gray-200)] rounded">
              <div className="px-4 py-3 border-b border-[var(--gray-200)]">
                <h2 className="font-semibold text-[var(--gray-900)] flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Wholesaler Signature
                </h2>
                <p className="text-xs text-[var(--gray-500)] mt-1">
                  {isTwoSeller ? 'Buyer (wholesaler) signature required before sending' : isThreeParty ? 'Assignor (wholesaler) signature required before sending' : 'Buyer signature required before sending to seller'}
                </p>
              </div>
              <div className="p-4">
                {/* Signature Status - Already Signed (and not in re-signing mode) */}
                {contract.custom_fields?.buyer_signature && contract.custom_fields?.buyer_initials && !isResigning ? (
                  <div className="p-4 bg-[var(--success-50)] border border-[var(--success-200)] rounded">
                    <div className="flex items-center gap-2 text-[var(--success-700)] mb-3">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Signed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-[var(--gray-200)] rounded p-3">
                        <p className="text-xs text-[var(--gray-500)] mb-2">Signature</p>
                        <img
                          src={contract.custom_fields.buyer_signature}
                          alt="Signature"
                          className="max-h-20"
                        />
                      </div>
                      {contract.custom_fields.buyer_initials && (
                        <div className="bg-white border border-[var(--gray-200)] rounded p-3">
                          <p className="text-xs text-[var(--gray-500)] mb-2">Initials</p>
                          <img
                            src={contract.custom_fields.buyer_initials}
                            alt="Initials"
                            className="h-12"
                          />
                        </div>
                      )}
                    </div>
                    {contract.custom_fields?.company_name && (
                      <p className="text-sm text-[var(--gray-600)] mt-3">
                        <span className="font-medium">{contract.custom_fields.company_name}</span>
                        {contract.custom_fields.company_signer_name && (
                          <span> - {contract.custom_fields.company_signer_name}</span>
                        )}
                      </p>
                    )}
                    {isManager && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, buyer_signature: '', buyer_initials: '' }))
                          setIsResigning(true)
                        }}
                        className="text-xs mt-3"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Re-sign
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Not Signed - Show form for managers, message for users */}
                    {isManager ? (
                      <div className="space-y-4">
                        {/* Company Info */}
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs text-[var(--gray-600)]">Company Name *</Label>
                            <Input
                              value={formData.company_name}
                              onChange={(e) => updateField('company_name', e.target.value)}
                              placeholder="Your company name"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-[var(--gray-600)]">Signer Name *</Label>
                            <Input
                              value={formData.company_signer_name}
                              onChange={(e) => updateField('company_signer_name', e.target.value)}
                              placeholder="Person signing"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-[var(--gray-600)]">Email *</Label>
                            <Input
                              type="email"
                              value={formData.company_email}
                              onChange={(e) => updateField('company_email', e.target.value)}
                              placeholder="your@email.com"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-[var(--gray-600)]">Phone *</Label>
                            <Input
                              value={formData.company_phone}
                              onChange={(e) => updateField('company_phone', formatPhoneNumber(e.target.value))}
                              placeholder="(555) 123-4567"
                              maxLength={14}
                            />
                          </div>
                        </div>

                        {/* Signature - Full Width */}
                        <div>
                          <Label className="text-xs text-[var(--gray-600)] mb-2 block">Signature *</Label>
                          {formData.buyer_signature ? (
                            <div className="space-y-2">
                              <div className="border border-[var(--gray-300)] rounded-md p-3 bg-white">
                                <img src={formData.buyer_signature} alt="Signature" className="max-h-24 mx-auto" />
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={clearSignature} className="text-xs">
                                <RotateCcw className="w-3 h-3 mr-1" /> Clear
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex border border-[var(--gray-300)] rounded-md overflow-hidden w-48">
                                <button
                                  type="button"
                                  onClick={() => setSignatureMode('draw')}
                                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                    signatureMode === 'draw' ? 'bg-[var(--primary-900)] text-white' : 'bg-white text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
                                  }`}
                                >
                                  <PenTool className="w-3 h-3 inline mr-1" /> Draw
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSignatureMode('type')}
                                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--gray-300)] ${
                                    signatureMode === 'type' ? 'bg-[var(--primary-900)] text-white' : 'bg-white text-[var(--gray-700)] hover:bg-[var(--gray-50)]'
                                  }`}
                                >
                                  Type
                                </button>
                              </div>
                              {signatureMode === 'draw' ? (
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
                                    <Button type="button" variant="outline" size="sm" onClick={() => signatureRef.current?.clear()}>
                                      <RotateCcw className="w-3 h-3 mr-1" /> Clear
                                    </Button>
                                    <button
                                      type="button"
                                      onClick={saveDrawnSignature}
                                      style={{ backgroundColor: '#16a34a', color: 'white' }}
                                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:opacity-90"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" /> Save Signature
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Input value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} placeholder="Type your full name" />
                                  {typedSignature && (
                                    <div className="border border-[var(--gray-300)] rounded-md p-4 bg-white flex items-center justify-center min-h-[96px]">
                                      <span style={{ fontFamily: '"Dancing Script", "Brush Script MT", cursive', fontSize: '36px' }}>{typedSignature}</span>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={saveTypedSignature}
                                    disabled={!typedSignature.trim()}
                                    style={{ backgroundColor: typedSignature.trim() ? '#16a34a' : '#d1d5db', color: typedSignature.trim() ? 'white' : '#6b7280' }}
                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:opacity-90 disabled:cursor-not-allowed"
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" /> Save Signature
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Initials - Only for non-three-party */}
                        {!isThreeParty && (
                          <div>
                            <Label className="text-xs text-[var(--gray-600)] mb-2 block">Initials *</Label>
                            {formData.buyer_initials ? (
                              <div className="space-y-2">
                                <div className="border border-[var(--gray-300)] rounded-md p-3 bg-white inline-block">
                                  <img src={formData.buyer_initials} alt="Initials" className="h-12" />
                                </div>
                                <div>
                                  <Button type="button" variant="outline" size="sm" onClick={clearInitials} className="text-xs">
                                    <RotateCcw className="w-3 h-3 mr-1" /> Clear
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex border border-[var(--gray-300)] rounded-md overflow-hidden w-40">
                                  <button
                                    type="button"
                                    onClick={() => setInitialsMode('draw')}
                                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                                      initialsMode === 'draw' ? 'bg-[var(--primary-900)] text-white' : 'bg-white text-[var(--gray-700)]'
                                    }`}
                                  >
                                    Draw
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInitialsMode('type')}
                                    className={`flex-1 px-3 py-2 text-xs font-medium transition-colors border-l border-[var(--gray-300)] ${
                                      initialsMode === 'type' ? 'bg-[var(--primary-900)] text-white' : 'bg-white text-[var(--gray-700)]'
                                    }`}
                                  >
                                    Type
                                  </button>
                                </div>
                                {initialsMode === 'draw' ? (
                                  <div className="space-y-2">
                                    <div className="border border-[var(--gray-300)] rounded-md bg-white inline-block">
                                      <SignatureCanvas
                                        ref={initialsRef}
                                        canvasProps={{
                                          className: 'rounded-md',
                                          style: { width: '120px', height: '60px' }
                                        }}
                                        backgroundColor="white"
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button type="button" variant="outline" size="sm" onClick={() => initialsRef.current?.clear()}>
                                        Clear
                                      </Button>
                                      <button
                                        type="button"
                                        onClick={saveDrawnInitials}
                                        style={{ backgroundColor: '#16a34a', color: 'white' }}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:opacity-90"
                                      >
                                        Save Initials
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <Input value={typedInitials} onChange={(e) => setTypedInitials(e.target.value.slice(0, 4))} placeholder="JD" className="w-20" maxLength={4} />
                                    {typedInitials && (
                                      <div className="border border-[var(--gray-300)] rounded-md p-3 bg-white inline-block">
                                        <span style={{ fontFamily: '"Dancing Script", "Brush Script MT", cursive', fontSize: '32px' }}>{typedInitials.toUpperCase()}</span>
                                      </div>
                                    )}
                                    <div>
                                      <button
                                        type="button"
                                        onClick={saveTypedInitials}
                                        disabled={!typedInitials.trim()}
                                        style={{ backgroundColor: typedInitials.trim() ? '#16a34a' : '#d1d5db', color: typedInitials.trim() ? 'white' : '#6b7280' }}
                                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md hover:opacity-90 disabled:cursor-not-allowed"
                                      >
                                        Save Initials
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-2 border-t border-[var(--gray-200)]">
                          <button
                            onClick={handleSaveSignatureOnly}
                            disabled={savingSignature || !formData.buyer_signature || (!isThreeParty && !formData.buyer_initials) || !formData.company_name || !formData.company_signer_name || !formData.company_email || !formData.company_phone}
                            style={{
                              backgroundColor: (savingSignature || !formData.buyer_signature || (!isThreeParty && !formData.buyer_initials) || !formData.company_name || !formData.company_signer_name || !formData.company_email || !formData.company_phone) ? '#d1d5db' : '#16a34a',
                              color: (savingSignature || !formData.buyer_signature || (!isThreeParty && !formData.buyer_initials) || !formData.company_name || !formData.company_signer_name || !formData.company_email || !formData.company_phone) ? '#6b7280' : 'white'
                            }}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed"
                          >
                            {savingSignature ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save & Submit Signature
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Non-manager view - show pending status and notify button */
                      <div className="space-y-4">
                        <div className="p-4 bg-[var(--warning-50)] border border-[var(--warning-200)] rounded">
                          <div className="flex items-center gap-2 text-[var(--warning-700)] mb-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-medium">Signature Required</span>
                          </div>
                          <p className="text-sm text-[var(--warning-600)]">
                            A manager must sign this contract before it can be sent to the seller.
                          </p>
                        </div>
                        <Button
                          onClick={handleNotifyManager}
                          disabled={notifyingManager}
                          className="bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white"
                        >
                          {notifyingManager ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Notifying...
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-2" />
                              Notify Manager to Sign
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

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

                    // Get party label from metadata for three-party contracts
                    const metadata = item.metadata as {
                      action?: string
                      party?: string
                      assignee_email?: string
                      assignee_name?: string
                      documenso_payload?: {
                        recipients?: Array<{ email: string; signingStatus: string }>
                      }
                    }

                    // Determine party label based on action or context
                    let partyLabel = ''
                    if (isThreeParty) {
                      if (metadata.party === 'seller') {
                        partyLabel = isTwoSeller ? 'Seller 1' : 'Seller'
                      } else if (metadata.party === 'assignee') {
                        partyLabel = secondSignerLabel
                      } else if (metadata.action === 'sent_for_signing') {
                        partyLabel = isTwoSeller ? 'Seller 1' : 'Seller' // Initial send is to seller/seller1
                      } else if (metadata.action === 'sent_to_assignee' || metadata.action === 'assignee_added_after_seller_signed') {
                        partyLabel = secondSignerLabel
                      }
                    }

                    // Build display label
                    let displayLabel = itemStatus.label
                    if (metadata.action === 'sent_to_assignee') {
                      displayLabel = `Sent to ${secondSignerLabel}`
                    } else if (metadata.action === 'assignee_added_after_seller_signed') {
                      displayLabel = `${secondSignerLabel} Added`
                    } else if (metadata.action === 'recipient_signed') {
                      displayLabel = 'Signed'
                    } else if (metadata.action === 'seller_document_completed') {
                      displayLabel = `Signed (Ready for ${isTwoSeller ? 'Seller 2' : 'Buyer'})`
                    } else if (metadata.action === 'buyer_document_completed') {
                      displayLabel = 'Signed'
                    } else if (metadata.action === 'recipient_viewed') {
                      displayLabel = 'Viewed'
                    }

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
                            {partyLabel && (
                              <span className="text-[var(--primary-600)]">{partyLabel}: </span>
                            )}
                            {displayLabel}
                          </p>
                          <p className="text-xs text-[var(--gray-500)]">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                          {metadata.assignee_email && (
                            <p className="text-xs text-[var(--gray-400)]">
                              {metadata.assignee_email}
                            </p>
                          )}
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

          {/* Manager-Only Signature Section */}
          {isManager && contract.status !== 'draft' && contract.status !== 'completed' && contract.status !== 'cancelled' && !contract.custom_fields?.buyer_signature && (
            <div className="bg-white border border-[var(--warning-300)] rounded">
              <div className="px-4 py-3 border-b border-[var(--warning-300)] bg-[var(--warning-50)]">
                <h2 className="font-semibold text-[var(--warning-800)] flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  Wholesaler Signature Required
                </h2>
                <p className="text-xs text-[var(--warning-700)] mt-1">
                  This contract was sent without your company&apos;s signature. As a manager, you can sign it now.
                </p>
              </div>
              <div className="p-4 space-y-4">
                {/* Company Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Company Name</Label>
                    <Input
                      value={formData.company_name}
                      onChange={(e) => updateField('company_name', e.target.value)}
                      placeholder="Enter your company name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Signer Name</Label>
                    <Input
                      value={formData.company_signer_name}
                      onChange={(e) => updateField('company_signer_name', e.target.value)}
                      placeholder="Person signing the contract"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Company Email</Label>
                    <Input
                      type="email"
                      value={formData.company_email}
                      onChange={(e) => updateField('company_email', e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-[var(--gray-600)]">Company Phone</Label>
                    <Input
                      value={formData.company_phone}
                      onChange={(e) => updateField('company_phone', formatPhoneNumber(e.target.value))}
                      placeholder="(555) 123-4567"
                      maxLength={14}
                    />
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <Label className="text-xs text-[var(--gray-600)] mb-2 block">Signature</Label>
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
                            <button
                              type="button"
                              onClick={saveDrawnSignature}
                              style={{ backgroundColor: '#16a34a', color: 'white' }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Save Signature
                            </button>
                          </div>
                        </div>
                      ) : (
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
                          <button
                            type="button"
                            onClick={saveTypedSignature}
                            disabled={!typedSignature.trim()}
                            style={{ backgroundColor: typedSignature.trim() ? '#16a34a' : '#d1d5db', color: typedSignature.trim() ? 'white' : '#6b7280' }}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Save Signature
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.buyer_signature}
                  style={{
                    backgroundColor: (saving || !formData.buyer_signature) ? '#d1d5db' : '#16a34a',
                    color: (saving || !formData.buyer_signature) ? '#6b7280' : 'white'
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Signature
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Send Contract - Signer Information (Managers Only) */}
          {isManager && (contract.status === 'draft' || contract.status === 'ready') && (
            <div className="bg-white border border-[var(--gray-200)] rounded">
              <div className="px-4 py-3 border-b border-[var(--gray-200)]">
                <h2 className="font-semibold text-[var(--gray-900)]">Send Contract</h2>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-xs text-[var(--gray-600)]">
                  Enter the signer information below. The signing document will be sent via Documenso.
                </p>

                {/* Seller Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-[var(--gray-700)] flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {isTwoSeller ? 'Seller 1' : sellerLabel} {isThreeParty && <span className="text-xs text-[var(--primary-600)]">(Signs 1st)</span>}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">Name *</Label>
                      <Input
                        value={sendToSellerName}
                        onChange={(e) => setSendToSellerName(e.target.value)}
                        placeholder={isAssignment ? "Assignee name" : "Seller name"}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">Email *</Label>
                      <Input
                        type="email"
                        value={sendToSellerEmail}
                        onChange={(e) => setSendToSellerEmail(e.target.value)}
                        placeholder={isAssignment ? "assignee@email.com" : "seller@email.com"}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">Phone</Label>
                      <Input
                        value={sendToSellerPhone}
                        onChange={(e) => setSendToSellerPhone(formatPhoneNumber(e.target.value))}
                        placeholder="(555) 123-4567"
                        maxLength={14}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">Address</Label>
                      <Input
                        value={sendToSellerAddress}
                        onChange={(e) => setSendToSellerAddress(e.target.value)}
                        placeholder="123 Main St, City, State ZIP"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Assignee/Seller 2 Section - only for two-stage contracts */}
                {isThreeParty && (
                  <div className="space-y-2 pt-2 border-t border-[var(--gray-200)]">
                    <h3 className="text-sm font-medium text-[var(--gray-700)] flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {secondSignerLabel} <span className="text-xs text-[var(--primary-600)]">(Signs 2nd)</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Name *</Label>
                        <Input
                          value={sendToAssigneeName}
                          onChange={(e) => setSendToAssigneeName(e.target.value)}
                          placeholder={isTwoSeller ? "Seller 2 name" : "Assignee name"}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Email *</Label>
                        <Input
                          type="email"
                          value={sendToAssigneeEmail}
                          onChange={(e) => setSendToAssigneeEmail(e.target.value)}
                          placeholder={isTwoSeller ? "seller2@email.com" : "assignee@email.com"}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Phone</Label>
                        <Input
                          value={sendToAssigneePhone}
                          onChange={(e) => setSendToAssigneePhone(formatPhoneNumber(e.target.value))}
                          placeholder="(555) 123-4567"
                          maxLength={14}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-[var(--gray-600)]">Address</Label>
                        <Input
                          value={sendToAssigneeAddress}
                          onChange={(e) => setSendToAssigneeAddress(e.target.value)}
                          placeholder="123 Main St, City, State ZIP"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Signer Info Button */}
                <div className="pt-2 border-t border-[var(--gray-200)]">
                  <button
                    onClick={handleSaveSignerInfo}
                    disabled={savingSignerInfo}
                    style={{ backgroundColor: savingSignerInfo ? '#d1d5db' : '#16a34a', color: savingSignerInfo ? '#6b7280' : 'white' }}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md disabled:cursor-not-allowed"
                  >
                    {savingSignerInfo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Signer Info
                      </>
                    )}
                  </button>
                </div>

                {!canSend() && (
                  <div className="text-xs text-[var(--warning-700)] bg-[var(--warning-100)] p-2 rounded">
                    <p className="font-medium">Required before sending:</p>
                    <ul className="mt-1 list-disc list-inside">
                      {!contract.custom_fields?.buyer_signature && (
                        <li>Wholesaler signature</li>
                      )}
                      {!isThreeParty && !contract.custom_fields?.buyer_initials && (
                        <li>Wholesaler initials</li>
                      )}
                      {!sendToSellerName.trim() && (
                        <li>{sellerLabel} name</li>
                      )}
                      {(!sendToSellerEmail || !isValidEmail(sendToSellerEmail)) && (
                        <li>Valid {sellerLabel.toLowerCase()} email address</li>
                      )}
                      {isThreeParty && !sendToAssigneeName.trim() && (
                        <li>{secondSignerLabel} name</li>
                      )}
                      {isThreeParty && (!sendToAssigneeEmail || !isValidEmail(sendToAssigneeEmail)) && (
                        <li>Valid {secondSignerLabel.toLowerCase()} email address</li>
                      )}
                    </ul>
                  </div>
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
              {(contract.status === 'draft' || contract.status === 'ready') && (
                <>
                  {/* Preview Button - available for everyone */}
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

                  {/* Send and Delete - Managers Only */}
                  {isManager && (
                    <>
                      <hr className="my-2 border-[var(--gray-200)]" />

                      {/* Send Button */}
                      <Button
                        onClick={() => inititateSend(contractType)}
                        disabled={sending || !canSend()}
                        className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send Contract
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
                </>
              )}

              {(contract.status === 'sent' || contract.status === 'viewed') && contract.documenso_document_id && (
                <div className="py-2">
                  {/* Recipient Signing Status */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-[var(--gray-700)]">Signing Status</h4>
                      <button
                        onClick={fetchRecipientStatus}
                        disabled={statusLoading}
                        className="text-xs text-[var(--gray-500)] hover:text-[var(--gray-700)] flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </button>
                    </div>
                    {statusLoading && recipientStatuses.length === 0 ? (
                      <div className="text-center py-2">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-[var(--gray-400)]" />
                      </div>
                    ) : recipientStatuses.length > 0 ? (
                      <div className="space-y-2">
                        {recipientStatuses.map((recipient) => (
                          <div
                            key={recipient.id}
                            className="flex items-center justify-between p-2 bg-[var(--gray-50)] rounded text-sm"
                          >
                            <div>
                              <span className="font-medium text-[var(--gray-700)]">
                                {recipient.role === 'seller' ? (isTwoSeller ? 'Seller 1' : 'Seller') : recipient.role === 'assignee' ? secondSignerLabel : recipient.name}
                              </span>
                              <span className="text-[var(--gray-500)] ml-1">
                                ({recipient.email})
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {recipient.signingStatus === 'SIGNED' ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-[var(--success-600)]" />
                                  <span className="text-xs text-[var(--success-700)]">Signed</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-[var(--warning-600)]" />
                                  <span className="text-xs text-[var(--warning-700)]">Pending</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Clock className="w-6 h-6 text-[var(--info-700)] mx-auto mb-1" />
                        <p className="text-xs text-[var(--gray-500)]">
                          Waiting for signatures...
                        </p>
                      </div>
                    )}
                  </div>

                  <hr className="my-3 border-[var(--gray-200)]" />

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      onClick={handleResend}
                      disabled={resending}
                      variant="outline"
                      className="w-full"
                    >
                      {resending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Resend Contract
                    </Button>
                    <a
                      href={`/api/contracts/${id}/preview?type=${contractType}&signed=true`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full block"
                    >
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Document
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {/* Seller Signed - Ready to send to Buyer (Three-party contracts) */}
              {/* Show when: status is seller_signed, OR (three-party + sent/viewed + signing status is SIGNED) */}
              {(contract.status === 'seller_signed' ||
                (isThreeParty &&
                 (contract.status === 'sent' || contract.status === 'viewed') &&
                 recipientStatuses.length > 0 &&
                 recipientStatuses.every(r => r.signingStatus === 'SIGNED'))) && (
                <div className="py-2">
                  <div className="mb-4 p-3 bg-[var(--success-100)] border border-[var(--success-200)] rounded">
                    <div className="flex items-center gap-2 text-[var(--success-700)] mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{isTwoSeller ? 'Seller 1' : 'Seller'} has signed!</span>
                    </div>
                    <p className="text-sm text-[var(--success-600)]">
                      {isTwoSeller ? 'Seller 1' : 'The seller'} has completed their signature. You can now send the contract to {isTwoSeller ? 'Seller 2' : 'the buyer'} for their signature.
                    </p>
                  </div>

                  {/* Buyer Info - Only email is editable */}
                  <div className="mb-4 space-y-3">
                    <h4 className="text-sm font-medium text-[var(--gray-700)]">Send Document To</h4>
                    <p className="text-xs text-[var(--gray-500)]">
                      Change the email below if needed. This only affects where the signing request is sent, not the contract document itself.
                    </p>
                    <div className="p-2 bg-[var(--gray-50)] rounded">
                      <p className="text-sm font-medium text-[var(--gray-700)]">{sendToAssigneeName || (isTwoSeller ? 'Seller 2' : 'Buyer')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[var(--gray-600)]">Email Address *</Label>
                      <Input
                        type="email"
                        value={sendToAssigneeEmail}
                        onChange={(e) => setSendToAssigneeEmail(e.target.value)}
                        placeholder="buyer@email.com"
                        className="mt-1"
                      />
                      {sendToAssigneeEmail && !isValidEmail(sendToAssigneeEmail) && (
                        <p className="text-xs text-[var(--error-600)] mt-1">Please enter a valid email address</p>
                      )}
                    </div>
                    <Button
                      onClick={handleSaveBuyerInfo}
                      disabled={savingBuyerInfo || !sendToAssigneeEmail || !isValidEmail(sendToAssigneeEmail)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {savingBuyerInfo ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Email
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleSend(contractType, 'buyer')}
                    disabled={sending || !sendToAssigneeEmail || !isValidEmail(sendToAssigneeEmail)}
                    className="w-full bg-[var(--primary-900)] hover:bg-[var(--primary-800)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send to {isTwoSeller ? 'Seller 2' : 'Buyer'} for Signature
                  </Button>
                </div>
              )}

              {/* Buyer Pending - Waiting for buyer to sign (Three-party contracts) */}
              {/* Note: buyer_pending status only exists for three-party contracts */}
              {contract.status === 'buyer_pending' && (
                <div className="py-2">
                  <div className="mb-4 p-3 bg-[var(--info-100)] border border-[var(--info-200)] rounded">
                    <div className="flex items-center gap-2 text-[var(--info-700)] mb-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">Waiting for {isTwoSeller ? 'Seller 2' : 'Buyer'}</span>
                    </div>
                    <p className="text-sm text-[var(--info-600)]">
                      The contract has been sent to the {isTwoSeller ? 'second seller' : 'buyer'}. Waiting for their signature.
                    </p>
                  </div>

                  {/* Buyer Info */}
                  <div className="mb-4 p-3 bg-[var(--gray-50)] rounded">
                    <h4 className="text-sm font-medium text-[var(--gray-700)] mb-2">{isTwoSeller ? 'Seller 2' : 'Buyer/Assignee'}</h4>
                    <p className="text-sm text-[var(--gray-600)]">{sendToAssigneeName || 'Not set'}</p>
                    <p className="text-sm text-[var(--gray-500)]">{sendToAssigneeEmail || 'No email'}</p>
                  </div>

                  <Button
                    onClick={handleResend}
                    disabled={resending}
                    variant="outline"
                    className="w-full"
                  >
                    {resending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Resend to Buyer
                  </Button>
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
                  <a
                    href={`/api/contracts/${id}/preview?type=${contractType}&signed=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full block"
                  >
                    <Button variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Document
                    </Button>
                  </a>
                </>
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
