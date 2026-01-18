/**
 * AI Clause Generation Service
 *
 * Currently uses placeholder clauses. Will be integrated with OpenAI
 * when API key is configured.
 */

export type ClauseType =
  | 'as-is'
  | 'inspection-contingency'
  | 'financing-contingency'
  | 'title-contingency'
  | 'seller-disclosure'
  | 'assignment-rights'
  | 'earnest-money'
  | 'closing-costs'
  | 'possession'
  | 'custom'

interface ClauseRequest {
  type: ClauseType
  context?: string // Additional context for custom clauses
}

interface GeneratedClause {
  type: ClauseType
  title: string
  content: string
}

// Placeholder clauses until OpenAI is configured
const PLACEHOLDER_CLAUSES: Record<ClauseType, GeneratedClause> = {
  'as-is': {
    type: 'as-is',
    title: 'AS-IS CONDITION',
    content: `Buyer acknowledges that the Property is being sold in "AS-IS" condition. Seller makes no warranties, express or implied, regarding the condition of the Property, including but not limited to the roof, foundation, plumbing, electrical, HVAC systems, or any other structural or mechanical components. Buyer accepts the Property in its present condition and agrees to conduct their own inspections prior to closing.`,
  },
  'inspection-contingency': {
    type: 'inspection-contingency',
    title: 'INSPECTION CONTINGENCY',
    content: `This Agreement is contingent upon Buyer's approval of a professional inspection of the Property. Buyer shall have the right to conduct inspections at Buyer's expense within the Inspection Period specified herein. If Buyer is not satisfied with the results of any inspection, Buyer may terminate this Agreement by written notice to Seller, and Buyer's earnest money deposit shall be refunded in full.`,
  },
  'financing-contingency': {
    type: 'financing-contingency',
    title: 'FINANCING CONTINGENCY',
    content: `This Agreement is contingent upon Buyer obtaining financing approval within thirty (30) days of the Effective Date. If Buyer is unable to obtain financing on terms acceptable to Buyer, Buyer may terminate this Agreement by written notice to Seller, and Buyer's earnest money deposit shall be refunded in full. Buyer agrees to make good faith efforts to obtain financing and shall provide Seller with proof of loan application within seven (7) days.`,
  },
  'title-contingency': {
    type: 'title-contingency',
    title: 'TITLE CONTINGENCY',
    content: `Seller shall provide marketable title to the Property, free and clear of all liens, encumbrances, easements, and restrictions except those specifically accepted by Buyer. Buyer shall have the right to obtain a title examination and title insurance at Buyer's expense. If title defects are discovered that cannot be cured prior to closing, Buyer may terminate this Agreement and receive a full refund of the earnest money deposit.`,
  },
  'seller-disclosure': {
    type: 'seller-disclosure',
    title: 'SELLER DISCLOSURE',
    content: `Seller represents and warrants that, to the best of Seller's knowledge: (a) there are no pending or threatened legal actions affecting the Property; (b) there are no violations of any building codes, zoning ordinances, or other governmental regulations; (c) all utilities are properly connected and functional; and (d) Seller has disclosed all known material defects affecting the Property.`,
  },
  'assignment-rights': {
    type: 'assignment-rights',
    title: 'ASSIGNMENT RIGHTS',
    content: `Buyer shall have the right to assign this Agreement to a third party without Seller's consent. Upon assignment, Buyer shall notify Seller in writing of the assignee's name and contact information. The original Buyer shall remain liable for the performance of this Agreement unless expressly released by Seller in writing. Assignee shall assume all rights and obligations of Buyer under this Agreement.`,
  },
  'earnest-money': {
    type: 'earnest-money',
    title: 'EARNEST MONEY PROVISIONS',
    content: `The earnest money deposit shall be held in escrow by the designated Escrow Agent and shall be applied toward the purchase price at closing. In the event of Buyer's default, Seller shall be entitled to retain the earnest money as liquidated damages. In the event of Seller's default, Buyer shall be entitled to return of the earnest money and may pursue all available legal remedies.`,
  },
  'closing-costs': {
    type: 'closing-costs',
    title: 'CLOSING COSTS ALLOCATION',
    content: `Closing costs shall be allocated as follows: Seller shall pay for the preparation of the deed, satisfaction of existing mortgages, transfer taxes (if any), and Seller's attorney fees. Buyer shall pay for recording fees, title insurance premiums, lender's fees, Buyer's attorney fees, and all costs associated with Buyer's financing. All other closing costs shall be allocated according to local custom.`,
  },
  'possession': {
    type: 'possession',
    title: 'POSSESSION AND OCCUPANCY',
    content: `Seller shall deliver possession of the Property to Buyer at closing, free of all occupants and personal property not included in this sale. The Property shall be in broom-clean condition with all debris removed. If Seller fails to deliver possession at closing, Seller shall pay Buyer a daily occupancy fee equal to one-thirtieth (1/30) of the monthly fair market rental value until possession is delivered.`,
  },
  'custom': {
    type: 'custom',
    title: 'ADDITIONAL PROVISIONS',
    content: `[Custom clause content will be generated based on your specific requirements when AI integration is enabled. Please provide context for the type of clause you need.]`,
  },
}

class AIClauseService {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
  }

  /**
   * Check if AI generation is available
   */
  isAIEnabled(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0)
  }

  /**
   * Generate a clause using AI or return placeholder
   */
  async generateClause(request: ClauseRequest): Promise<GeneratedClause> {
    // For now, always return placeholder clauses
    // When OpenAI is configured, this will generate custom clauses
    if (this.isAIEnabled() && request.type === 'custom' && request.context) {
      // TODO: Implement OpenAI integration
      // const response = await openai.chat.completions.create({
      //   model: 'gpt-4',
      //   messages: [
      //     { role: 'system', content: 'You are a real estate contract attorney...' },
      //     { role: 'user', content: `Generate a contract clause for: ${request.context}` }
      //   ]
      // })
      // return { type: 'custom', title: 'CUSTOM PROVISION', content: response.choices[0].message.content }
    }

    return PLACEHOLDER_CLAUSES[request.type]
  }

  /**
   * Generate multiple clauses and format them for contract insertion
   */
  async generateClauses(requests: ClauseRequest[]): Promise<string> {
    const clauses = await Promise.all(
      requests.map(req => this.generateClause(req))
    )

    // Format clauses as HTML for template insertion
    return clauses
      .map(clause => `
        <div class="ai-clause">
          <h4>${clause.title}</h4>
          <p>${clause.content}</p>
        </div>
      `)
      .join('\n')
  }

  /**
   * Get recommended clauses based on contract type and conditions
   */
  getRecommendedClauses(
    contractType: 'purchase' | 'assignment',
    options?: {
      isAsIs?: boolean
      hasInspection?: boolean
      hasFinancing?: boolean
      isWholesale?: boolean
    }
  ): ClauseType[] {
    const recommended: ClauseType[] = []

    if (contractType === 'purchase') {
      // Always include title contingency
      recommended.push('title-contingency')

      // Add based on options
      if (options?.isAsIs) {
        recommended.push('as-is')
      }
      if (options?.hasInspection) {
        recommended.push('inspection-contingency')
      }
      if (options?.hasFinancing) {
        recommended.push('financing-contingency')
      }
      if (options?.isWholesale) {
        recommended.push('assignment-rights')
      }

      // Standard clauses
      recommended.push('earnest-money')
      recommended.push('possession')
    }

    if (contractType === 'assignment') {
      recommended.push('assignment-rights')
      recommended.push('earnest-money')
    }

    return recommended
  }
}

export const aiClauseService = new AIClauseService()
