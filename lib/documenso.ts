const DOCUMENSO_API_URL = process.env.DOCUMENSO_API_URL || 'http://localhost:3001'
const DOCUMENSO_API_KEY = process.env.DOCUMENSO_API_KEY

interface Recipient {
  id: number  // Template recipient ID
  name: string
  email: string
  signingOrder?: number
}

interface TemplateRecipient {
  id: number
  email: string
  name: string
  role: string
}

interface Template {
  id: number
  title: string
  Recipient: TemplateRecipient[]
}

interface GenerateDocumentResponse {
  documentId: number
  externalId?: string
  recipients: Array<{
    recipientId: number
    name: string
    email: string
    token: string
    role: string
    signingOrder?: number
    signingUrl: string
  }>
}

interface DocumentStatus {
  id: number
  title: string
  status: 'DRAFT' | 'PENDING' | 'COMPLETED'
  recipients: Array<{
    id: number
    email: string
    name: string
    role: string
    signingStatus: 'NOT_SIGNED' | 'SIGNED'
    signedAt?: string
    token: string
  }>
}

interface CreateDocumentResponse {
  id: number
  userId: number
  teamId?: number
  title: string
  status: 'DRAFT' | 'PENDING' | 'COMPLETED'
  documentDataId: string
  createdAt: string
  updatedAt: string
  externalId?: string
}

interface AddRecipientResponse {
  id: number
  documentId: number
  email: string
  name: string
  role: string
  token: string
  signingOrder?: number
}

interface AddFieldResponse {
  id: number
  documentId: number
  recipientId: number
  type: string
  page: number
  positionX: number
  positionY: number
  width: number
  height: number
}

interface DocumentRecipient {
  name: string
  email: string
  role?: 'SIGNER' | 'VIEWER' | 'APPROVER'
  signingOrder?: number
}

interface SignatureFieldPosition {
  page: number
  x: number
  y: number
  width: number
  height: number
  recipientEmail: string // To match with recipient
  fieldType?: 'signature' | 'initials' // Type of field
}


class DocumensoClient {
  private baseUrl: string
  private apiKey: string

  constructor() {
    this.baseUrl = DOCUMENSO_API_URL
    this.apiKey = DOCUMENSO_API_KEY || ''
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`

    console.log(`[Documenso] Request: ${options.method || 'GET'} ${url}`)

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Documenso] Error: ${response.status} - ${error}`)
      throw new Error(`Documenso API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    console.log(`[Documenso] Response:`, JSON.stringify(data).slice(0, 500))
    return data
  }

  /**
   * Upload a PDF and create a template using the Documenso API
   * Uses the v2 API which supports multipart form data uploads (works with local storage)
   */
  async createTemplate(
    file: Buffer,
    fileName: string,
    title: string
  ): Promise<{ templateId: string }> {
    const url = `${this.baseUrl}/api/v2/template/create`

    console.log(`[Documenso] Creating template via v2 API: ${url}`)

    // Create FormData with the file and payload
    const formData = new FormData()

    // The v2 API expects 'payload' as JSON string and 'file' as the PDF
    const payload = JSON.stringify({ title })
    formData.append('payload', payload)

    const pdfBlob = new Blob([new Uint8Array(file)], { type: 'application/pdf' })
    formData.append('file', pdfBlob, fileName)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Documenso] Template creation failed: ${response.status} - ${errorText}`)
      throw new Error(`Failed to create template: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[Documenso] Template created:`, JSON.stringify(data).slice(0, 500))

    // The response contains the template with its ID
    const templateId = data.id || data.template?.id || data.templateId

    if (!templateId) {
      throw new Error('Template created but no ID returned')
    }

    console.log(`[Documenso] Template created successfully with ID: ${templateId}`)

    return { templateId: String(templateId) }
  }

  /**
   * Get template details including recipients
   */
  async getTemplate(templateId: string): Promise<Template> {
    return this.request(`/templates/${templateId}`)
  }

  /**
   * List all templates
   */
  async listTemplates() {
    return this.request<{ templates: Template[]; totalPages: number }>('/templates')
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string) {
    try {
      return await this.request(`/templates/${templateId}`, { method: 'DELETE' })
    } catch {
      return false
    }
  }

  /**
   * Generate a document from a template with recipient mapping and form values
   *
   * @param templateId - The template ID
   * @param options.title - Optional document title
   * @param options.recipients - Array of recipients with template recipient ID mapping
   * @param options.meta - Optional metadata (subject, message)
   * @param options.externalId - Optional external ID for tracking
   * @param options.formValues - Key-value pairs to pre-fill text fields in the template
   */
  async generateDocumentFromTemplate(
    templateId: string,
    options: {
      title?: string
      recipients: Recipient[]
      meta?: {
        subject?: string
        message?: string
        timezone?: string
      }
      externalId?: string
      formValues?: Record<string, string | number | boolean>
    }
  ): Promise<GenerateDocumentResponse> {
    return this.request(`/templates/${templateId}/generate-document`, {
      method: 'POST',
      body: JSON.stringify({
        title: options.title,
        recipients: options.recipients.map(r => ({
          id: r.id,
          email: r.email,
          name: r.name,
          signingOrder: r.signingOrder,
        })),
        meta: options.meta ? {
          subject: options.meta.subject || '',
          message: options.meta.message || '',
          timezone: options.meta.timezone || 'America/New_York',
        } : undefined,
        externalId: options.externalId,
        formValues: options.formValues,
      }),
    })
  }

  /**
   * Send document for signing
   */
  async sendDocument(documentId: string | number, sendEmail: boolean = true): Promise<void> {
    await this.request(`/documents/${documentId}/send`, {
      method: 'POST',
      body: JSON.stringify({
        sendEmail,
      }),
    })
  }

  /**
   * Get document status
   */
  async getDocumentStatus(documentId: string | number): Promise<DocumentStatus> {
    return this.request(`/documents/${documentId}`)
  }

  /**
   * Get signing URL for a recipient
   */
  async getSigningUrl(documentId: string | number, recipientEmail: string): Promise<string> {
    const doc = await this.getDocumentStatus(documentId)
    const recipient = doc.recipients?.find(
      (r) => r.email === recipientEmail
    )

    if (!recipient?.token) {
      throw new Error('Recipient not found or no token available')
    }

    return `${this.baseUrl}/sign/${recipient.token}`
  }

  /**
   * Download signed document
   */
  async downloadSignedDocument(documentId: string | number): Promise<string> {
    const response = await this.request<{ downloadUrl: string }>(
      `/documents/${documentId}/download`
    )
    return response.downloadUrl
  }

  /**
   * Resend signing request to specific recipients
   */
  async resendToRecipients(documentId: string | number, recipientIds: number[]): Promise<void> {
    await this.request(`/documents/${documentId}/resend`, {
      method: 'POST',
      body: JSON.stringify({ recipients: recipientIds }),
    })
  }

  // ============================================
  // Direct Document Creation (without templates)
  // ============================================

  /**
   * Create a new document by uploading a PDF directly
   * Uses the v2 API which supports multipart form data uploads
   */
  async createDocument(
    pdfBuffer: Buffer,
    options: {
      title: string
      externalId?: string
      meta?: {
        signingOrder?: 'PARALLEL' | 'SEQUENTIAL'
        subject?: string
        message?: string
      }
    }
  ): Promise<CreateDocumentResponse> {
    const url = `${this.baseUrl}/api/v2/document/create`

    console.log(`[Documenso] Creating document via v2 API: ${url}`)

    const formData = new FormData()

    const payload = JSON.stringify({
      title: options.title,
      externalId: options.externalId,
      meta: options.meta,
    })
    formData.append('payload', payload)

    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
    formData.append('file', pdfBlob, `${options.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.apiKey,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Documenso] Document creation failed: ${response.status} - ${errorText}`)
      throw new Error(`Failed to create document: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[Documenso] Document created:`, JSON.stringify(data).slice(0, 500))

    return data
  }

  /**
   * Add a recipient (signer) to a document
   */
  async addRecipient(
    documentId: number,
    recipient: DocumentRecipient
  ): Promise<AddRecipientResponse> {
    return this.request(`/documents/${documentId}/recipients`, {
      method: 'POST',
      body: JSON.stringify({
        email: recipient.email,
        name: recipient.name,
        role: recipient.role || 'SIGNER',
        signingOrder: recipient.signingOrder,
      }),
    })
  }

  /**
   * Add multiple recipients to a document
   */
  async addRecipients(
    documentId: number,
    recipients: DocumentRecipient[]
  ): Promise<AddRecipientResponse[]> {
    const results: AddRecipientResponse[] = []
    for (const recipient of recipients) {
      const result = await this.addRecipient(documentId, recipient)
      results.push(result)
    }
    return results
  }

  /**
   * Add a signature field to a document for a specific recipient
   * @param type - Field type: 'SIGNATURE' or 'INITIALS'
   */
  async addSignatureField(
    documentId: number,
    recipientId: number,
    field: {
      page: number
      x: number
      y: number
      width: number
      height: number
      type?: 'SIGNATURE' | 'INITIALS'
    }
  ): Promise<AddFieldResponse> {
    // Documenso uses 1-indexed pages (pageNumber must be > 0)
    // Coordinates are percentages (0-100) relative to page size
    const payload = {
      recipientId,
      type: field.type || 'SIGNATURE',
      pageNumber: field.page,
      pageX: field.x,
      pageY: field.y,
      pageWidth: field.width,
      pageHeight: field.height,
    }
    console.log(`[Documenso] addSignatureField: recipientId=${recipientId}, page=${field.page}, pos=(${field.x},${field.y}), size=(${field.width}x${field.height}), type=${field.type || 'SIGNATURE'}`)
    console.log(`[Documenso] Full payload:`, JSON.stringify(payload))

    try {
      const result = await this.request<AddFieldResponse>(`/documents/${documentId}/fields`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      console.log(`[Documenso] addSignatureField success:`, result)
      return result
    } catch (error) {
      console.error(`[Documenso] addSignatureField FAILED for page ${field.page}, type ${field.type}:`, error)
      throw error
    }
  }

  /**
   * Add a date field to a document for a specific recipient
   */
  async addDateField(
    documentId: number,
    recipientId: number,
    field: {
      page: number
      x: number
      y: number
      width: number
      height: number
    }
  ): Promise<AddFieldResponse> {
    return this.request(`/documents/${documentId}/fields`, {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        type: 'DATE',
        pageNumber: field.page,
        pageX: field.x,
        pageY: field.y,
        pageWidth: field.width,
        pageHeight: field.height,
      }),
    })
  }

  /**
   * Complete workflow: Create document, add recipients, add signature fields, and optionally send
   * This is the main method for creating documents from PDFs generated by the app
   */
  async createDocumentWithSignatures(
    pdfBuffer: Buffer,
    options: {
      title: string
      externalId?: string
      recipients: DocumentRecipient[]
      signatureFields: SignatureFieldPosition[]
      sendImmediately?: boolean
      meta?: {
        subject?: string
        message?: string
      }
    }
  ): Promise<{
    documentId: number
    recipients: Array<{
      id: number
      email: string
      name: string
      signingUrl: string
    }>
  }> {
    // Check if we need sequential signing (multiple recipients with signing order)
    const hasSigningOrder = options.recipients.some(r => r.signingOrder !== undefined && r.signingOrder > 1)

    // Step 1: Create the document with signingOrder set to SEQUENTIAL if needed
    const document = await this.createDocument(pdfBuffer, {
      title: options.title,
      externalId: options.externalId,
      meta: {
        signingOrder: hasSigningOrder ? 'SEQUENTIAL' : 'PARALLEL',
        subject: options.meta?.subject,
        message: options.meta?.message,
      },
    })

    console.log(`[Documenso] Document created with ID: ${document.id}`)

    // Step 2: Add recipients
    const addedRecipients = await this.addRecipients(document.id, options.recipients)
    console.log(`[Documenso] Added ${addedRecipients.length} recipients`)

    // Create a map of email to recipient ID for field assignment
    const recipientMap = new Map<string, number>()
    for (const r of addedRecipients) {
      recipientMap.set(r.email.toLowerCase(), r.id)
    }

    // Step 3: Add signature/initials fields
    console.log(`[Documenso] ===== STEP 3: Adding signature fields =====`)
    console.log(`[Documenso] Total fields to add: ${options.signatureFields.length}`)
    console.log(`[Documenso] Recipient map:`, JSON.stringify(Object.fromEntries(recipientMap)))

    // CRITICAL: Fail if no fields to add
    if (options.signatureFields.length === 0) {
      console.error(`[Documenso] CRITICAL ERROR: No signature fields provided!`)
      throw new Error('No signature fields to add - cannot send document without signature fields')
    }

    let fieldsAdded = 0
    let fieldsFailed = 0
    let fieldsSkipped = 0

    for (const field of options.signatureFields) {
      const emailLower = field.recipientEmail.toLowerCase()
      const recipientId = recipientMap.get(emailLower)

      console.log(`[Documenso] Processing field: email="${field.recipientEmail}" (lowercase: "${emailLower}"), recipientId=${recipientId}`)

      if (recipientId) {
        const fieldType = field.fieldType === 'initials' ? 'INITIALS' : 'SIGNATURE'
        console.log(`[Documenso] Adding ${fieldType} field: page=${field.page}, x=${field.x}, y=${field.y}, width=${field.width}, height=${field.height}`)
        try {
          await this.addSignatureField(document.id, recipientId, {
            page: field.page,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            type: fieldType,
          })
          console.log(`[Documenso] SUCCESS: Added ${fieldType} field for ${field.recipientEmail} on page ${field.page}`)
          fieldsAdded++
        } catch (fieldError) {
          console.error(`[Documenso] FAILED to add ${fieldType} field on page ${field.page} for ${field.recipientEmail}:`, fieldError)
          fieldsFailed++
          // Continue with other fields instead of failing completely
        }
      } else {
        console.warn(`[Documenso] SKIPPED: No recipientId found for "${field.recipientEmail}" - available emails: ${Array.from(recipientMap.keys()).join(', ')}`)
        fieldsSkipped++
      }
    }
    console.log(`[Documenso] Fields summary: ${fieldsAdded} added, ${fieldsFailed} failed out of ${options.signatureFields.length} total`)

    // If no signature fields were added successfully, that's a problem
    if (fieldsAdded === 0 && options.signatureFields.length > 0) {
      throw new Error('Failed to add any signature fields to the document')
    }

    // Log a warning if some fields failed
    if (fieldsFailed > 0) {
      console.warn(`[Documenso] WARNING: ${fieldsFailed} fields failed to add. Document may be incomplete.`)
    }

    // Step 4: Send document if requested
    if (options.sendImmediately) {
      // Small delay to ensure fields are fully registered in Documenso
      await new Promise(resolve => setTimeout(resolve, 500))
      await this.sendDocument(document.id)
      console.log(`[Documenso] Document sent for signing`)
    }

    // Step 5: Get signing URLs for recipients
    const docStatus = await this.getDocumentStatus(document.id)

    return {
      documentId: document.id,
      recipients: docStatus.recipients.map(r => ({
        id: r.id,
        email: r.email,
        name: r.name,
        signingUrl: `${this.baseUrl}/sign/${r.token}`,
      })),
    }
  }
}

export const documenso = new DocumensoClient()
