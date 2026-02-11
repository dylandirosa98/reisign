const LOOPS_API_KEY = process.env.LOOPS_API_KEY
const LOOPS_MAILING_LIST_ID = process.env.LOOPS_MAILING_LIST_ID

interface LoopsContact {
  email: string
  firstName?: string
  lastName?: string
  companyName?: string
  plan?: string
  signupDate?: string
  userId?: string
  companyId?: string
  source?: string
}

class LoopsClient {
  private apiKey: string
  private mailingListId: string
  private baseUrl = 'https://app.loops.so/api/v1'

  constructor() {
    this.apiKey = LOOPS_API_KEY || ''
    this.mailingListId = LOOPS_MAILING_LIST_ID || ''
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      console.warn('[Loops] API key not configured, skipping request')
      throw new Error('Loops API key not configured')
    }

    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Loops] Error: ${response.status} - ${error}`)
      throw new Error(`Loops API error: ${response.status} - ${error}`)
    }

    return response.json()
  }

  /**
   * Add or update a contact in Loops
   */
  async createOrUpdateContact(contact: LoopsContact): Promise<{ success: boolean; id?: string }> {
    try {
      const result = await this.request<{ success: boolean; id?: string }>('/contacts/create', {
        method: 'POST',
        body: JSON.stringify({
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          // Custom properties
          companyName: contact.companyName,
          plan: contact.plan,
          signupDate: contact.signupDate,
          userId: contact.userId,
          companyId: contact.companyId,
          source: contact.source || 'app_signup',
          // Add to mailing list
          mailingLists: this.mailingListId ? {
            [this.mailingListId]: true,
          } : undefined,
        }),
      })

      console.log(`[Loops] Contact created/updated: ${contact.email}`)
      return result
    } catch (error) {
      console.error(`[Loops] Failed to create/update contact:`, error)
      throw error
    }
  }

  /**
   * Update a contact's properties (e.g., when they upgrade their plan)
   */
  async updateContact(email: string, properties: Partial<LoopsContact>): Promise<{ success: boolean }> {
    try {
      const result = await this.request<{ success: boolean }>('/contacts/update', {
        method: 'PUT',
        body: JSON.stringify({
          email,
          ...properties,
        }),
      })

      console.log(`[Loops] Contact updated: ${email}`)
      return result
    } catch (error) {
      console.error(`[Loops] Failed to update contact:`, error)
      throw error
    }
  }

  /**
   * Send a transactional email
   */
  async sendTransactionalEmail(
    email: string,
    transactionalId: string,
    dataVariables?: Record<string, string>
  ): Promise<{ success: boolean }> {
    try {
      const result = await this.request<{ success: boolean }>('/transactional', {
        method: 'POST',
        body: JSON.stringify({
          email,
          transactionalId,
          dataVariables,
        }),
      })

      console.log(`[Loops] Transactional email sent to: ${email}`)
      return result
    } catch (error) {
      console.error(`[Loops] Failed to send transactional email:`, error)
      throw error
    }
  }

  /**
   * Send an event to trigger automations
   */
  async sendEvent(
    email: string,
    eventName: string,
    eventProperties?: Record<string, string | number | boolean>
  ): Promise<{ success: boolean }> {
    try {
      const result = await this.request<{ success: boolean }>('/events/send', {
        method: 'POST',
        body: JSON.stringify({
          email,
          eventName,
          eventProperties,
        }),
      })

      console.log(`[Loops] Event sent: ${eventName} for ${email}`)
      return result
    } catch (error) {
      console.error(`[Loops] Failed to send event:`, error)
      throw error
    }
  }
}

export const loops = new LoopsClient()

/**
 * Helper to check if Loops is configured
 */
export function isLoopsConfigured(): boolean {
  return !!LOOPS_API_KEY && !!LOOPS_MAILING_LIST_ID
}
