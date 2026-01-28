import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium-min'
import fs from 'fs/promises'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createAdminClient } from '@/lib/supabase/admin'

// Check if running in production (Vercel) or local development
const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

// Remote chromium URL for serverless environments
const CHROMIUM_REMOTE_URL = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

export interface ContractData {
  // Property fields
  property_address: string
  property_city: string
  property_state: string
  property_zip: string
  apn?: string

  // Seller fields (property owner)
  seller_name: string
  seller_email: string
  seller_phone?: string
  seller_address?: string

  // Company/Wholesaler fields (the "Buyer" on Purchase Agreement)
  company_name: string
  company_email?: string
  company_phone?: string
  company_address?: string
  company_city?: string
  company_state?: string
  company_zip?: string
  company_signer_name?: string

  // End Buyer fields (for Assignment Contract)
  buyer_name?: string
  buyer_email?: string
  buyer_phone?: string

  // Assignee fields (for Three Party Assignment)
  assignee_name?: string
  assignee_email?: string
  assignee_phone?: string
  assignee_address?: string

  // Price fields
  purchase_price: number
  earnest_money?: number
  assignment_fee?: number

  // Escrow fields
  escrow_agent_name?: string
  escrow_agent_address?: string
  escrow_officer?: string
  escrow_agent_email?: string

  // Contract terms
  close_of_escrow?: string
  inspection_period?: string
  personal_property?: string
  additional_terms?: string

  // Section 1.10 closing amounts
  escrow_fees_split?: 'split' | 'buyer'
  title_policy_paid_by?: 'seller' | 'buyer'
  hoa_fees_split?: 'split' | 'buyer'

  // AI-generated clauses (formatted HTML string or array of clause objects)
  ai_clauses?: string | Array<{ id: string; title: string; content: string; editedContent?: string }>

  // Contract date (auto-generated if not provided)
  contract_date?: string

  // Buyer signature (base64 image)
  buyer_signature?: string

  // Buyer initials (base64 image) - auto-applied to all pages
  buyer_initials?: string
}

export type TemplateType = 'purchase-agreement' | 'assignment-contract'

/**
 * PDF Generator Service
 * Converts HTML templates to PDFs with dynamic data interpolation
 */
class PDFGeneratorService {
  private templatesDir: string

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'lib', 'templates')
  }

  /**
   * Detect the section number that precedes the {{ai_clauses}} placeholder
   * Returns the starting number for AI clauses (e.g., if after section 8.3, returns { major: 8, minor: 4 })
   */
  private detectClausePosition(template: string): { major: number; minor: number } {
    // Find where {{ai_clauses}} appears in the template
    const placeholderIndex = template.indexOf('{{ai_clauses}}')
    if (placeholderIndex === -1) {
      // Default to 12.6 if no placeholder found (backward compatibility)
      return { major: 12, minor: 6 }
    }

    // Get the text before the placeholder
    const textBefore = template.substring(0, placeholderIndex)

    // Find all section numbers in the format X.Y (e.g., "8.3", "12.5")
    const sectionPattern = /(\d{1,2})\.(\d{1,2})/g
    const matches = [...textBefore.matchAll(sectionPattern)]

    if (matches.length > 0) {
      // Get the last section number before the placeholder
      const lastMatch = matches[matches.length - 1]
      const major = parseInt(lastMatch[1], 10)
      const minor = parseInt(lastMatch[2], 10)
      // AI clauses start at the next subsection
      return { major, minor: minor + 1 }
    }

    // Default fallback
    return { major: 12, minor: 6 }
  }

  /**
   * Format AI clauses array into HTML for PDF
   * If startingPosition is provided, uses that for numbering
   * Otherwise detects position from template or defaults to 12.6
   */
  private formatAiClauses(
    clauses: ContractData['ai_clauses'],
    startingPosition?: { major: number; minor: number }
  ): string {
    if (!clauses) return ''

    // If it's already a string, return as-is
    if (typeof clauses === 'string') return clauses

    // If it's an array, convert to HTML
    if (Array.isArray(clauses) && clauses.length > 0) {
      const { major, minor } = startingPosition || { major: 12, minor: 6 }

      const clauseHtml = clauses.map((clause, index) => {
        const content = clause.editedContent || clause.content
        const clauseNumber = `${major}.${minor + index}`
        return `<p class="paragraph">
          <strong>${clauseNumber}</strong> <em>${clause.title}:</em> ${content}
        </p>`
      }).join('')

      return clauseHtml
    }

    return ''
  }

  /**
   * Load an HTML template - priority order:
   * 1. Company template (if companyTemplateId provided)
   * 2. State-specific template from database
   * 3. General template from database
   * 4. File-based template
   *
   * Returns the HTML content and optional signature layout for company templates
   */
  private async loadTemplate(
    templateType: TemplateType,
    stateCode?: string,
    companyTemplateId?: string
  ): Promise<{ html: string; signatureLayout?: string }> {
    // If company template ID is provided, load from company_templates
    if (companyTemplateId) {
      try {
        const supabase = createAdminClient()
        const { data: companyTemplateData } = await supabase
          .from('company_templates' as any)
          .select('html_content, name, signature_layout')
          .eq('id', companyTemplateId)
          .single()

        const companyTemplate = companyTemplateData as {
          html_content: string;
          name: string;
          signature_layout?: string
        } | null

        if (companyTemplate?.html_content) {
          console.log('[PDF Generator] Using company template:', companyTemplate.name, 'with signature layout:', companyTemplate.signature_layout)
          return {
            html: companyTemplate.html_content,
            signatureLayout: companyTemplate.signature_layout
          }
        }
      } catch (error) {
        console.error('Error loading company template:', error)
        // Fall through to other template sources
      }
    }
    // Convert state name to state code if needed (e.g., "Florida" -> "FL")
    const stateCodeMap: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
      'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
      'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
      'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
      'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
      'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
      'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
      'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
      'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
      'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
      'Wisconsin': 'WI', 'Wyoming': 'WY'
    }

    // Normalize state code
    const normalizedStateCode = stateCode
      ? (stateCodeMap[stateCode] || stateCode.toUpperCase())
      : null

    // Only check database for purchase agreements (we have HTML editing for those)
    if (templateType === 'purchase-agreement' && normalizedStateCode) {
      try {
        const supabase = createAdminClient()

        // First check if this state has a customized template
        if (normalizedStateCode !== 'GENERAL') {
          const { data: stateTemplate } = await supabase
            .from('state_templates')
            .select('purchase_agreement_html, is_purchase_customized')
            .eq('state_code', normalizedStateCode)
            .single()

          if (stateTemplate?.is_purchase_customized && stateTemplate?.purchase_agreement_html) {
            return { html: stateTemplate.purchase_agreement_html }
          }
        }

        // Fall back to general template from database
        const { data: generalTemplate } = await supabase
          .from('state_templates')
          .select('purchase_agreement_html')
          .eq('state_code', 'GENERAL')
          .single()

        if (generalTemplate?.purchase_agreement_html) {
          return { html: generalTemplate.purchase_agreement_html }
        }
      } catch (error) {
        console.error('Error loading template from database:', error)
        // Fall through to file-based template
      }
    }

    // Fall back to file-based template
    const templatePath = path.join(this.templatesDir, `${templateType}.html`)
    try {
      const html = await fs.readFile(templatePath, 'utf-8')
      return { html }
    } catch (error) {
      throw new Error(`Template not found: ${templateType}`)
    }
  }

  /**
   * Interpolate template variables with actual data
   */
  private interpolateTemplate(template: string, data: ContractData): string {
    // Format number with commas (NO dollar sign - it's in the template)
    const formatNumber = (value: number | undefined) =>
      value ? value.toLocaleString() : ''

    // Format date for display
    const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return ''
      try {
        return new Date(dateStr).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      } catch {
        return dateStr
      }
    }

    // Format date
    const contractDate = data.contract_date ||
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })

    // Build full addresses
    const fullPropertyAddress = `${data.property_address}, ${data.property_city}, ${data.property_state} ${data.property_zip}`
    const companyFullAddress = data.company_address
      ? `${data.company_address}, ${data.company_city || ''}, ${data.company_state || ''} ${data.company_zip || ''}`
      : ''

    // Log signer data for debugging
    console.log(`[PDF Generator] Signer data: Seller=${data.seller_name}/${data.seller_email}/${data.seller_phone}/${data.seller_address}`)
    console.log(`[PDF Generator] Signer data: Assignee=${data.assignee_name}/${data.assignee_email}/${data.assignee_phone}/${data.assignee_address}`)

    // Create replacement map
    const replacements: Record<string, string> = {
      // Property
      property_address: data.property_address || '',
      property_city: data.property_city || '',
      property_state: data.property_state || '',
      property_zip: data.property_zip || '',
      full_property_address: fullPropertyAddress,
      apn: data.apn || '',

      // Seller
      seller_name: data.seller_name || '',
      seller_email: data.seller_email || '',
      seller_phone: data.seller_phone || '',
      seller_address: data.seller_address || '',

      // Company (Buyer on Purchase Agreement)
      company_name: data.company_name || '',
      company_email: data.company_email || '',
      company_phone: data.company_phone || '',
      company_address: data.company_address || '',
      company_city: data.company_city || '',
      company_state: data.company_state || '',
      company_zip: data.company_zip || '',
      company_full_address: companyFullAddress,
      company_signer_name: data.company_signer_name || data.company_name || '',

      // End Buyer (Assignment Contract)
      buyer_name: data.buyer_name || '',
      buyer_email: data.buyer_email || '',
      buyer_phone: data.buyer_phone || '',

      // Assignee (Three Party Assignment)
      assignee_name: data.assignee_name || '',
      assignee_email: data.assignee_email || '',
      assignee_phone: data.assignee_phone || '',
      assignee_address: data.assignee_address || '',

      // Prices (NO dollar signs - they're in the template)
      purchase_price: formatNumber(data.purchase_price),
      earnest_money: formatNumber(data.earnest_money),
      assignment_fee: formatNumber(data.assignment_fee),

      // Escrow
      escrow_agent_name: data.escrow_agent_name || '',
      escrow_agent_address: data.escrow_agent_address || '',
      escrow_officer: data.escrow_officer || '',
      escrow_agent_email: data.escrow_agent_email || '',

      // Terms - close of escrow is a date, inspection period is number of days
      close_of_escrow: formatDate(data.close_of_escrow),
      inspection_period: data.inspection_period || '', // Number of days, not a date
      personal_property: data.personal_property || '',
      additional_terms: data.additional_terms || '',

      // Section 1.10 checkbox states (returns 'checked' or '' - all optional)
      escrow_fees_split_check: data.escrow_fees_split === 'split' ? 'checked' : '',
      escrow_fees_buyer_check: data.escrow_fees_split === 'buyer' ? 'checked' : '',
      title_policy_seller_check: data.title_policy_paid_by === 'seller' ? 'checked' : '',
      title_policy_buyer_check: data.title_policy_paid_by === 'buyer' ? 'checked' : '',
      hoa_fees_split_check: data.hoa_fees_split === 'split' ? 'checked' : '',
      hoa_fees_buyer_check: data.hoa_fees_split === 'buyer' ? 'checked' : '',

      // AI Clauses - convert array to HTML with auto-numbering based on position
      ai_clauses: this.formatAiClauses(data.ai_clauses, this.detectClausePosition(template)),

      // Date
      contract_date: contractDate,

      // Buyer signature - generate img tag if signature exists, empty string otherwise
      buyer_signature_img: data.buyer_signature && data.buyer_signature.trim()
        ? `<img src="${data.buyer_signature}" style="height: 40px; width: auto; object-fit: contain;" />`
        : '',

      // Buyer initials - generate img tag if initials exist, empty string otherwise
      buyer_initials_img: data.buyer_initials && data.buyer_initials.trim()
        ? `<img src="${data.buyer_initials}" style="height: 26px; width: auto; object-fit: contain;" />`
        : '',
    }

    // Replace all {{variable}} patterns
    let result = template
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      result = result.replace(regex, value)
    }

    // Handle conditional AI clauses section
    const hasAiClauses = data.ai_clauses && (
      (typeof data.ai_clauses === 'string' && data.ai_clauses.trim()) ||
      (Array.isArray(data.ai_clauses) && data.ai_clauses.length > 0)
    )
    if (hasAiClauses) {
      // Remove the conditional tags, keep the content
      result = result.replace(/\{\{#if ai_clauses\}\}/g, '')
      result = result.replace(/\{\{\/if\}\}/g, '')
    } else {
      // Remove the entire AI clauses block if empty
      result = result.replace(/\{\{#if ai_clauses\}\}[\s\S]*?\{\{\/if\}\}/g, '')
    }

    return result
  }

  /**
   * Generate footer template with initials boxes
   * For three-party: Seller initials on left, Assignee initials on right (both via Documenso, no pre-filled)
   * For other layouts: Seller initials on left (Documenso), Buyer initials on right (pre-filled by wholesaler)
   */
  private generateFooterTemplate(buyerInitialsImg: string, signatureLayout?: string): string {
    const isThreeParty = signatureLayout === 'three-party'

    // For three-party, use "Assignee Initials" label and empty box (Documenso will fill)
    // For other layouts, use "Buyer Initials" with pre-filled image from form
    const rightLabel = isThreeParty ? 'Assignee Initials:' : 'Buyer Initials:'
    const rightContent = isThreeParty ? '' : buyerInitialsImg

    return `
      <div style="width: 100%; font-size: 9px; font-family: 'Tinos', 'Times New Roman', Times, serif; padding: 0 0.5in;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 5px;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>Seller Initials:</span>
            <div style="width: 50px; height: 22px; border: 1px solid #000;"></div>
          </div>
          <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
          <div style="display: flex; align-items: center; gap: 5px;">
            <span>${rightLabel}</span>
            <div style="width: 50px; height: 22px; border: 1px solid #000; display: flex; align-items: center; justify-content: center;">
              ${rightContent}
            </div>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Load signature page HTML from template file based on layout
   */
  private async loadSignaturePageTemplate(layout: string): Promise<string> {
    const templateMap: Record<string, string> = {
      'two-column': 'two-column.html',
      'seller-only': 'seller-only.html',
      'three-party': 'three-party-assignment.html',
    }

    const fileName = templateMap[layout] || templateMap['two-column']
    const templatePath = path.join(this.templatesDir, 'signature-pages', fileName)

    try {
      return await fs.readFile(templatePath, 'utf-8')
    } catch (error) {
      console.error(`Error loading signature page template: ${fileName}`, error)
      // Return a basic fallback
      return `<div class="signature-page"><p>Signature Page</p></div>`
    }
  }

  /**
   * Get CSS styles for signature pages (extracted from purchase-agreement template)
   */
  private getSignaturePageStyles(): string {
    return `
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
    `
  }

  /**
   * Generate signature page HTML based on layout
   */
  private async generateSignaturePageHtml(
    layout: string,
    data: ContractData
  ): Promise<string> {
    // Load the signature page template
    let signatureHtml = await this.loadSignaturePageTemplate(layout)

    // Interpolate the template with data
    signatureHtml = this.interpolateTemplate(signatureHtml, data)

    return signatureHtml
  }

  /**
   * Inject Google Fonts into HTML for consistent rendering
   * Uses Tinos - a metric-compatible replacement for Times New Roman
   * This ensures the PDF looks identical to the template preview
   */
  private injectFonts(html: string): string {
    const fontLinks = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
    `

    // CSS to replace Times New Roman with Tinos (metric-compatible replacement)
    // This ensures exact same character widths and document layout
    const fontStyles = `
      <style>
        /* Replace Times New Roman with Tinos for consistent PDF rendering */
        @font-face {
          font-family: 'Times New Roman';
          src: local('Tinos'), local('Tinos-Regular');
          font-weight: normal;
          font-style: normal;
        }
        @font-face {
          font-family: 'Times New Roman';
          src: local('Tinos-Bold');
          font-weight: bold;
          font-style: normal;
        }
        @font-face {
          font-family: 'Times New Roman';
          src: local('Tinos-Italic');
          font-weight: normal;
          font-style: italic;
        }
        @font-face {
          font-family: 'Times New Roman';
          src: local('Tinos-BoldItalic');
          font-weight: bold;
          font-style: italic;
        }
        @font-face {
          font-family: 'Times';
          src: local('Tinos'), local('Tinos-Regular');
        }
        /* Also apply Tinos directly to body as fallback */
        body {
          font-family: 'Tinos', 'Times New Roman', Times, serif;
        }
      </style>
    `

    // Inject font links into head
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${fontLinks}${fontStyles}</head>`)
    } else if (html.includes('<body')) {
      // No head tag, add before body
      html = html.replace('<body', `${fontLinks}${fontStyles}<body`)
    } else {
      // No standard structure, prepend
      html = fontLinks + fontStyles + html
    }

    return html
  }

  /**
   * Generate PDF from HTML template with data
   * Priority: company template > state-specific template > general template > file
   */
  async generatePDF(
    templateType: TemplateType,
    data: ContractData,
    companyTemplateId?: string
  ): Promise<{ pdfBuffer: Buffer; signatureLayout?: string }> {
    // Load and interpolate template (pass company template ID and state for lookup)
    const { html: templateHtml, signatureLayout } = await this.loadTemplate(templateType, data.property_state, companyTemplateId)
    let html = this.interpolateTemplate(templateHtml, data)

    // Inject fonts for consistent rendering
    html = this.injectFonts(html)

    // Check if the template already has a signature page
    const hasSignaturePage = html.includes('class="signature-page"') || html.includes('class=\'signature-page\'')

    // If using a company template with a signature layout and no existing signature page, add one
    if (signatureLayout && !hasSignaturePage) {
      // Add "SIGNATURES ON FOLLOWING PAGE" notice
      const signaturesNotice = `
        <p class="center-text" style="text-align: center; margin-top: 30pt; font-weight: bold;">[SIGNATURES ON THE FOLLOWING PAGE]</p>
      `

      // Generate the signature page (now async)
      const signaturePage = await this.generateSignaturePageHtml(signatureLayout, data)

      // Get signature page styles
      const signatureStyles = this.getSignaturePageStyles()

      // Check if the HTML has a </style> tag to inject styles into
      if (html.includes('</style>')) {
        html = html.replace('</style>', `${signatureStyles}</style>`)
      } else if (html.includes('</head>')) {
        // Add a new style tag before </head>
        html = html.replace('</head>', `<style>${signatureStyles}</style></head>`)
      }

      // Insert before closing </body> tag
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${signaturesNotice}${signaturePage}</body>`)
      } else {
        html = html + signaturesNotice + signaturePage
      }

      console.log('[PDF Generator] Added signature page with layout:', signatureLayout)
    }

    // Generate buyer initials img tag for footer
    const buyerInitialsImg = data.buyer_initials && data.buyer_initials.trim()
      ? `<img src="${data.buyer_initials}" style="height: 18px; width: auto; object-fit: contain;" />`
      : ''

    // Generate footer template with initials (pass signatureLayout for three-party handling)
    const footerTemplate = this.generateFooterTemplate(buyerInitialsImg, signatureLayout)

    // Launch Puppeteer with appropriate chromium for environment
    const browser = await puppeteer.launch({
      args: isProduction
        ? chromium.args
        : ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: isProduction
        ? await chromium.executablePath(CHROMIUM_REMOTE_URL)
        : process.platform === 'win32'
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : process.platform === 'darwin'
            ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            : '/usr/bin/google-chrome',
      headless: true,
    })

    let pdfBytes: Uint8Array

    try {
      const page = await browser.newPage()

      // Set content and wait for styles to load
      await page.setContent(html, { waitUntil: 'networkidle0' })

      // Generate PDF with footer containing initials
      pdfBytes = await page.pdf({
        format: 'Letter',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '1in',
          left: '0.5in',
        },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: footerTemplate,
      })
    } finally {
      await browser.close()
    }

    // Use pdf-lib to remove footer from the last page by drawing a white rectangle over it
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()

    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1]
      const { width } = lastPage.getSize()

      // Draw a white rectangle over the footer area on the last page
      // Footer is in the bottom 1 inch (72 points) of the page
      lastPage.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 72, // 1 inch = 72 points
        color: rgb(1, 1, 1), // White
      })
    }

    const modifiedPdfBytes = await pdfDoc.save()
    return {
      pdfBuffer: Buffer.from(modifiedPdfBytes),
      signatureLayout,
    }
  }

  /**
   * Get the number of pages in a PDF buffer
   */
  async getPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
      // Use pdf-lib for accurate page count
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const count = pdfDoc.getPageCount()
      console.log(`[PDF Generator] getPageCount: ${count} pages detected`)
      return count
    } catch (error) {
      console.error(`[PDF Generator] getPageCount failed:`, error)
      // Default to 5 pages for purchase agreement
      return 5
    }
  }

  /**
   * Get signature field positions from generated PDF
   * Returns coordinates for where signature fields should be placed
   * Initials are in the footer (pages 1 to N-1), signature on the last page
   * Also returns DATE fields that auto-fill when the signer signs
   *
   * IMPORTANT: Documenso uses PERCENTAGE coordinates (0-100), not points!
   * - positionX, positionY, width, height are all percentages of page dimensions
   * - Origin is TOP-LEFT (0,0 = top-left corner)
   * - X increases going right, Y increases going down
   *
   * Letter size: 612 x 792 points
   * PDF margins (Puppeteer): top=0.5" (36pt), left=0.5" (36pt), right=0.5" (36pt), bottom=1" (72pt)
   * Content area: 540 x 684 points
   *
   * Positions calculated via scripts/measure-signatures.ts using Puppeteer rendering
   */
  async getSignaturePositions(
    _templateType: TemplateType,
    _data: ContractData,
    pageCount?: number,
    signatureLayout?: string
  ): Promise<Array<{ page: number; x: number; y: number; width: number; height: number; recipientRole: string; fieldType?: string }>> {
    const positions: Array<{ page: number; x: number; y: number; width: number; height: number; recipientRole: string; fieldType?: string }> = []
    const totalPages = pageCount || 2
    const pagesWithInitials = totalPages - 1
    const layout = signatureLayout || 'two-column'

    console.log(`[PDF Generator] Setting up signature fields: totalPages=${totalPages}, pagesWithInitials=${pagesWithInitials}, layout=${layout}`)

    // Signature field positions are determined by the TEMPLATE'S signature layout
    // This is independent of contract type (purchase vs assignment)

    if (layout === 'three-party') {
      // THREE-PARTY LAYOUT: Seller + Assignee both sign
      // Seller signs first (signingOrder: 1), Assignee signs second (signingOrder: 2)
      // Template has 3 stacked sections: Seller (top), Assignor/Wholesaler (middle, pre-signed), Assignee (bottom)

      // Seller initials in footer - LEFT side (pages 1 to N-1)
      for (let page = 1; page <= pagesWithInitials; page++) {
        positions.push({
          page: page,
          x: 13,
          y: 95,
          width: 8,
          height: 2.8,
          recipientRole: 'seller',
          fieldType: 'initials',
        })
      }

      // Assignee/Buyer initials in footer - RIGHT side (pages 1 to N-1)
      for (let page = 1; page <= pagesWithInitials; page++) {
        positions.push({
          page: page,
          x: 88,
          y: 95,
          width: 8,
          height: 2.8,
          recipientRole: 'buyer',
          fieldType: 'initials',
        })
      }

      // Seller signature - top section on signature page
      positions.push({
        page: totalPages,
        x: 13,
        y: 14.5,
        width: 30,
        height: 5,
        recipientRole: 'seller',
        fieldType: 'signature',
      })

      // Seller date field - below signature (DATE: row is 2 rows below signature)
      // In three-party template: Signature -> Printed Name -> DATE
      positions.push({
        page: totalPages,
        x: 11.3,
        y: 28.75,
        width: 25,
        height: 2.5,
        recipientRole: 'seller',
        fieldType: 'date',
      })

      // Assignee/Buyer signature - bottom section (seller y + 65%)
      positions.push({
        page: totalPages,
        x: 13,
        y: 79.5,
        width: 30,
        height: 5,
        recipientRole: 'buyer',
        fieldType: 'signature',
      })

      // Assignee/Buyer date field - below signature (same gap as seller: 14.25%)
      positions.push({
        page: totalPages,
        x: 11.3,
        y: 93.75,
        width: 25,
        height: 2.5,
        recipientRole: 'buyer',
        fieldType: 'date',
      })

      console.log(`[PDF Generator] Three-party positions:`, positions.map(p => ({
        page: p.page,
        role: p.recipientRole,
        type: p.fieldType,
        x: p.x,
        y: p.y
      })))

    } else if (layout === 'seller-only') {
      // SELLER-ONLY LAYOUT: Only seller signs
      // Used for first stage of three-party contracts (seller document)

      // Seller initials in footer - LEFT side (pages 1 to N-1)
      for (let page = 1; page <= pagesWithInitials; page++) {
        positions.push({
          page: page,
          x: 13,
          y: 95,
          width: 8,
          height: 2.8,
          recipientRole: 'seller',
          fieldType: 'initials',
        })
      }

      // Seller date field - ABOVE signature ("APPROVED AND ACCEPTED BY SELLER ON:" line)
      positions.push({
        page: totalPages,
        x: 27.3,
        y: 18.25,
        width: 42,
        height: 2.5,
        recipientRole: 'seller',
        fieldType: 'date',
      })

      // Seller signature - centered layout (container is 50% width, centered at 25% from left)
      // After header (~12%) and date row (~8%), signature box starts around 22-25%
      positions.push({
        page: totalPages,
        x: 26,
        y: 24,
        width: 42,
        height: 5,
        recipientRole: 'seller',
        fieldType: 'signature',
      })

      console.log(`[PDF Generator] Seller-only positions:`, positions.map(p => ({
        page: p.page,
        role: p.recipientRole,
        type: p.fieldType
      })))

    } else if (layout === 'buyer-only') {
      // BUYER-ONLY LAYOUT: Only buyer/assignee signs
      // Used for second stage of three-party contracts (buyer document)

      // Buyer initials in footer - RIGHT side (pages 1 to N-1)
      for (let page = 1; page <= pagesWithInitials; page++) {
        positions.push({
          page: page,
          x: 88,
          y: 95,
          width: 8,
          height: 2.8,
          recipientRole: 'buyer',
          fieldType: 'initials',
        })
      }

      // Buyer signature - bottom section on signature page (moved up a bit)
      positions.push({
        page: totalPages,
        x: 11,
        y: 58,
        width: 30,
        height: 5,
        recipientRole: 'buyer',
        fieldType: 'signature',
      })

      // Buyer date field - below signature (DATE: row is 2 rows below signature)
      positions.push({
        page: totalPages,
        x: 12.3,
        y: 65.25,
        width: 25,
        height: 2.5,
        recipientRole: 'buyer',
        fieldType: 'date',
      })

      console.log(`[PDF Generator] Buyer-only positions:`, positions.map(p => ({
        page: p.page,
        role: p.recipientRole,
        type: p.fieldType
      })))

    } else {
      // TWO-COLUMN LAYOUT (default): Only seller signs (left column)

      // Seller initials in footer (pages 1 to N-1)
      for (let page = 1; page <= pagesWithInitials; page++) {
        positions.push({
          page: page,
          x: 13,
          y: 95,
          width: 8,
          height: 2.8,
          recipientRole: 'seller',
          fieldType: 'initials',
        })
      }

      // Seller date field - ABOVE signature ("APPROVED AND ACCEPTED BY SELLER ON:" line)
      // X coordinate aligned with signature, Y is ~5% above
      positions.push({
        page: totalPages,
        x: 10.3,
        y: 20.75,
        width: 35,
        height: 2.5,
        recipientRole: 'seller',
        fieldType: 'date',
      })

      // Seller signature - left column on last page
      positions.push({
        page: totalPages,
        x: 9,
        y: 26.5,
        width: 35,
        height: 5,
        recipientRole: 'seller',
        fieldType: 'signature',
      })

      console.log(`[PDF Generator] Two-column positions:`, positions.map(p => ({
        page: p.page,
        role: p.recipientRole,
        type: p.fieldType
      })))
    }

    return positions
  }
}

/**
 * Add signing date(s) to a signed PDF
 * Places the date on the appropriate date line based on signature layout
 *
 * Template structures:
 * - Two-column: Date ABOVE signature ("APPROVED AND ACCEPTED BY SELLER ON:" line)
 * - Seller-only: Date ABOVE signature ("APPROVED AND ACCEPTED BY SELLER ON:" line)
 * - Three-party: Date BELOW signature (separate "DATE:" row under signature)
 * - Buyer-only: Date BELOW signature (separate "DATE:" row under signature)
 */
export async function addSigningDateToPdf(
  pdfBuffer: Buffer,
  options: {
    signatureLayout: string
    sellerSignedAt?: string
    buyerSignedAt?: string
  }
): Promise<Buffer> {
  const { signatureLayout, sellerSignedAt, buyerSignedAt } = options

  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width, height } = lastPage.getSize()

  // Embed font
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const fontSize = 10

  // Format date nicely
  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Position calculations - convert percentage to points
  // PDF coordinates: origin at bottom-left, y increases upward
  // Our percentage system: origin at top-left, y increases downward
  const percentToX = (pct: number) => (pct / 100) * width
  const percentToY = (pct: number) => height - ((pct / 100) * height)

  // Date positions based on signature layout
  // Positions are calibrated to the signature-line element in each template
  if (signatureLayout === 'two-column') {
    // Two-column: Date is ABOVE signature
    // Signature at y: 26.5%, date line is ~5% above at y: 21.5%
    // Left column starts at ~8% from left edge
    if (sellerSignedAt) {
      const dateText = formatDate(sellerSignedAt)
      const x = percentToX(9)
      const y = percentToY(22)
      lastPage.drawText(dateText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
    }
  } else if (signatureLayout === 'seller-only') {
    // Seller-only: Date is ABOVE signature, centered container
    // Container at 50% width centered (starts at 25%), signature at y: 24%
    // Date line is ~5% above at y: 19%
    if (sellerSignedAt) {
      const dateText = formatDate(sellerSignedAt)
      const x = percentToX(27)
      const y = percentToY(20)
      lastPage.drawText(dateText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
    }
  } else if (signatureLayout === 'three-party') {
    // Three-party: Date is BELOW signature (in left column, third row)
    // Seller section: signature at y: 14.5%, date at y: 28.75%
    // Assignee section: signature at y: 79.5%, date at y: 93.75%
    if (sellerSignedAt) {
      const dateText = formatDate(sellerSignedAt)
      const x = percentToX(11.3)
      const y = percentToY(29.5)
      lastPage.drawText(dateText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
    }
    if (buyerSignedAt) {
      const dateText = formatDate(buyerSignedAt)
      const x = percentToX(11.3)
      const y = percentToY(94.5)
      lastPage.drawText(dateText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
    }
  } else if (signatureLayout === 'buyer-only') {
    // Buyer-only: Date is BELOW signature (similar to three-party assignee section)
    // Signature at y: 58%, date is 2 rows below at ~66%
    if (buyerSignedAt) {
      const dateText = formatDate(buyerSignedAt)
      const x = percentToX(9)  // Left column
      const y = percentToY(67)
      lastPage.drawText(dateText, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
    }
  }

  const modifiedPdfBytes = await pdfDoc.save()
  return Buffer.from(modifiedPdfBytes)
}

export const pdfGenerator = new PDFGeneratorService()
