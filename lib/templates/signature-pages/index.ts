/**
 * Signature Page Layouts
 *
 * Each layout defines:
 * - id: Unique identifier
 * - name: Display name
 * - description: What this layout is for
 * - recipients: Who needs to sign via Documenso
 * - signaturePositions: Where to place signature fields (percentages 0-100)
 */

export type SignaturePageLayout =
  | 'two-column'        // Standard: Seller + Buyer side by side
  | 'two-column-assignment' // Assignment: Assignee + Assignor side by side
  | 'seller-only'       // Just seller signature
  | 'three-party'       // Seller + Assignor (pre-signed) + Assignee

export interface SignaturePosition {
  recipientRole: 'seller' | 'buyer' | 'assignee'
  fieldType: 'signature' | 'initials'
  x: number      // Percentage from left (0-100)
  y: number      // Percentage from top (0-100)
  width: number  // Percentage width (0-100)
  height: number // Percentage height (0-100)
}

export interface LayoutConfig {
  id: SignaturePageLayout
  name: string
  description: string
  recipients: Array<{
    role: 'seller' | 'buyer' | 'assignee'
    label: string
    signsViaDocumenso: boolean
  }>
  signaturePositions: SignaturePosition[]
}

export const SIGNATURE_PAGE_LAYOUTS: Record<SignaturePageLayout, LayoutConfig> = {
  'two-column': {
    id: 'two-column',
    name: 'Two Column (Standard)',
    description: 'Seller and Buyer signatures side by side. Buyer pre-signs, Seller signs via Documenso.',
    recipients: [
      { role: 'seller', label: 'Seller', signsViaDocumenso: true },
      { role: 'buyer', label: 'Buyer', signsViaDocumenso: false },
    ],
    signaturePositions: [
      {
        recipientRole: 'seller',
        fieldType: 'signature',
        x: 6,         // Left column, left margin
        y: 26,        // After header and first row
        width: 32,    // Half page width minus margins
        height: 4.5,
      },
    ],
  },

  'two-column-assignment': {
    id: 'two-column-assignment',
    name: 'Two Column (Assignment)',
    description: 'Assignee and Assignor signatures side by side. Assignor pre-signs, Assignee signs via Documenso.',
    recipients: [
      { role: 'seller', label: 'Assignee', signsViaDocumenso: true },
      { role: 'buyer', label: 'Assignor', signsViaDocumenso: false },
    ],
    signaturePositions: [
      {
        recipientRole: 'seller',
        fieldType: 'signature',
        x: 6,
        y: 26,
        width: 32,
        height: 4.5,
      },
    ],
  },

  'seller-only': {
    id: 'seller-only',
    name: 'Seller Only',
    description: 'Only seller signature. Buyer/Company has already pre-signed.',
    recipients: [
      { role: 'seller', label: 'Seller', signsViaDocumenso: true },
    ],
    signaturePositions: [
      {
        recipientRole: 'seller',
        fieldType: 'signature',
        x: 25,        // Centered (50% - half of 50% width)
        y: 22,        // After header, before other fields
        width: 50,    // Wider since centered
        height: 5,
      },
    ],
  },

  'three-party': {
    id: 'three-party',
    name: 'Three Party Assignment',
    description: 'Seller, Assignor (wholesaler pre-signs), and Assignee. Seller and Assignee sign via Documenso.',
    recipients: [
      { role: 'seller', label: 'Original Seller', signsViaDocumenso: true },
      { role: 'buyer', label: 'Assignor (Wholesaler)', signsViaDocumenso: false },
      { role: 'assignee', label: 'Assignee (End Buyer)', signsViaDocumenso: true },
    ],
    signaturePositions: [
      {
        recipientRole: 'seller',
        fieldType: 'signature',
        x: 6,         // Left column
        y: 18,        // First section - Seller
        width: 32,
        height: 4.5,
      },
      {
        recipientRole: 'assignee',
        fieldType: 'signature',
        x: 6,         // Left column
        y: 68,        // Third section - Assignee
        width: 32,
        height: 4.5,
      },
    ],
  },
}

/**
 * Get signature positions for a specific layout
 * Returns positions ready for Documenso API (all values are percentages 0-100)
 */
export function getSignaturePositionsForLayout(
  layoutId: SignaturePageLayout,
  pageNumber: number
): Array<{
  page: number
  x: number
  y: number
  width: number
  height: number
  recipientRole: string
  fieldType: string
}> {
  const layout = SIGNATURE_PAGE_LAYOUTS[layoutId]
  if (!layout) {
    console.warn(`Unknown layout: ${layoutId}, falling back to two-column`)
    return getSignaturePositionsForLayout('two-column', pageNumber)
  }

  return layout.signaturePositions.map(pos => ({
    page: pageNumber,
    x: pos.x,
    y: pos.y,
    width: pos.width,
    height: pos.height,
    recipientRole: pos.recipientRole,
    fieldType: pos.fieldType,
  }))
}

/**
 * Get recipients who need to sign via Documenso for a layout
 */
export function getDocumensoRecipients(layoutId: SignaturePageLayout): Array<{
  role: 'seller' | 'buyer' | 'assignee'
  label: string
}> {
  const layout = SIGNATURE_PAGE_LAYOUTS[layoutId]
  if (!layout) return []

  return layout.recipients
    .filter(r => r.signsViaDocumenso)
    .map(r => ({ role: r.role, label: r.label }))
}
