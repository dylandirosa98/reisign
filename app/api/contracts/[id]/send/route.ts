import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'
import { pdfGenerator, ContractData, TemplateType } from '@/lib/services/pdf-generator'
import { aiClauseService, ClauseType } from '@/lib/services/ai-clauses'
import { canCreateContract, PLANS, formatPrice } from '@/lib/plans'
import { chargeExtraContract, isStripeConfigured } from '@/lib/stripe'

// POST /api/contracts/[id]/send - Send contract for signing via Documenso
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  // Get company details for "buyer" fields on purchase agreement
  const { data: companyData } = await adminSupabase
    .from('companies')
    .select('name, email, phone, address, city, state, zip, signer_name, actual_plan, contracts_used_this_period, stripe_customer_id, overage_behavior, subscription_status')
    .eq('id', userData.company_id)
    .single()

  // Type the company data (columns added in migration 20250116000000)
  const company = companyData as {
    name: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    signer_name?: string
    actual_plan?: 'free' | 'individual' | 'team' | 'business' | 'admin'
    contracts_used_this_period?: number
    stripe_customer_id?: string
    overage_behavior?: 'auto_charge' | 'warn_each'
    subscription_status?: string
  } | null

  // Check if payment is past due - block contract sending
  if (company?.subscription_status === 'past_due') {
    return NextResponse.json({
      error: 'Your payment is past due. Please update your payment method to continue sending contracts.',
      paymentRequired: true,
    }, { status: 402 })
  }

  // Check contract limits
  const actualPlan = company?.actual_plan || 'free'
  const contractsUsed = company?.contracts_used_this_period || 0
  const limitCheck = canCreateContract(actualPlan, contractsUsed)

  // If not allowed and no overage possible (free tier), block
  if (!limitCheck.allowed && !limitCheck.isOverage) {
    return NextResponse.json({
      error: limitCheck.reason || 'Contract limit reached. Please upgrade your plan.',
      requiresUpgrade: true,
    }, { status: 403 })
  }

  // Track if this is an overage contract for billing
  const isOverageContract = limitCheck.isOverage === true

  // Get contract with property
  const { data: contract, error: contractError } = await adminSupabase
    .from('contracts')
    .select(`
      *,
      property:properties(id, address, city, state, zip)
    `)
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (contract.status !== 'draft') {
    return NextResponse.json({
      error: 'Contract has already been sent',
    }, { status: 400 })
  }

  // Get the body to determine which contract type to send and AI clauses
  const body = await request.json().catch(() => ({}))
  const sendType = body.type || 'purchase' // 'purchase' or 'assignment'
  const requestedClauses = body.clauses as ClauseType[] | undefined
  // Allow overriding signer info for sending (use provided values or fall back to contract values)
  const sellerNameToSend = body.sellerName || contract.seller_name
  const sellerEmailToSend = body.sellerEmail || contract.seller_email
  const sellerPhoneToSend = body.sellerPhone || (contract.custom_fields as Record<string, unknown>)?.seller_phone || ''
  const assigneeNameToSend = body.assigneeName || contract.buyer_name
  const assigneeEmailToSend = body.assigneeEmail || contract.buyer_email
  const assigneePhoneToSend = body.assigneePhone || (contract.custom_fields as Record<string, unknown>)?.buyer_phone || ''

  const customFields = contract.custom_fields as {
    property_address?: string
    property_city?: string
    property_state?: string
    property_zip?: string
    assignment_fee?: number
    seller_phone?: string
    seller_address?: string
    buyer_phone?: string
    contract_type?: string
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
    escrow_fees_split?: 'split' | 'buyer'
    title_policy_paid_by?: 'seller' | 'buyer'
    hoa_fees_split?: 'split' | 'buyer'
    company_name?: string
    company_signer_name?: string
    company_email?: string
    company_phone?: string
    buyer_signature?: string
    buyer_initials?: string
    company_template_id?: string
  } | null

  // Get the template to check signature layout (for three-party validation)
  let isThreeParty = false
  if (customFields?.company_template_id) {
    const { data: templateData } = await adminSupabase
      .from('company_templates' as any)
      .select('signature_layout')
      .eq('id', customFields.company_template_id)
      .single()
    const templateLayout = (templateData as any)?.signature_layout
    isThreeParty = templateLayout === 'three-party'
  }

  // Validate required buyer (company) signing fields - only use explicitly saved values
  const missingFields: string[] = []
  if (!customFields?.company_name) missingFields.push('Company Name')
  if (!customFields?.company_signer_name) missingFields.push('Signer Name')
  if (!customFields?.company_email) missingFields.push('Company Email')
  if (!customFields?.company_phone) missingFields.push('Company Phone')
  if (!customFields?.buyer_signature) missingFields.push('Buyer Signature')
  // Buyer initials only required for non-three-party templates (wholesaler doesn't need initials for three-party)
  if (!isThreeParty && !customFields?.buyer_initials) missingFields.push('Buyer Initials')

  if (missingFields.length > 0) {
    return NextResponse.json({
      error: `Missing required buyer signing fields: ${missingFields.join(', ')}. Please complete all buyer information before sending.`,
    }, { status: 400 })
  }

  try {
    // Determine template type
    const templateType: TemplateType = sendType === 'purchase'
      ? 'purchase-agreement'
      : 'assignment-contract'

    // Get property address
    const propertyAddress = customFields?.property_address || contract.property?.address || ''
    const propertyCity = customFields?.property_city || contract.property?.city || ''
    const propertyState = customFields?.property_state || contract.property?.state || ''
    const propertyZip = customFields?.property_zip || contract.property?.zip || ''

    // Generate AI clauses if requested
    let aiClausesHtml = ''
    if (requestedClauses && requestedClauses.length > 0) {
      aiClausesHtml = await aiClauseService.generateClauses(
        requestedClauses.map(type => ({ type }))
      )
    }

    // Build contract data for PDF generation
    const contractData: ContractData = {
      // Property
      property_address: propertyAddress,
      property_city: propertyCity,
      property_state: propertyState,
      property_zip: propertyZip,
      apn: customFields?.apn,

      // Seller - use send-to values which may override contract values
      seller_name: sellerNameToSend || '',
      seller_email: sellerEmailToSend || '',
      seller_phone: sellerPhoneToSend || customFields?.seller_phone,
      seller_address: customFields?.seller_address,

      // Company (Buyer on Purchase Agreement) - only use explicitly saved values
      company_name: customFields?.company_name || '',
      company_email: customFields?.company_email || '',
      company_phone: customFields?.company_phone || '',
      company_signer_name: customFields?.company_signer_name || '',

      // End Buyer/Assignee (Assignment Contract) - use send-to values which may override contract values
      buyer_name: assigneeNameToSend,
      buyer_email: assigneeEmailToSend,
      buyer_phone: assigneePhoneToSend || customFields?.buyer_phone,

      // Prices
      purchase_price: contract.price || 0,
      earnest_money: customFields?.earnest_money,
      assignment_fee: customFields?.assignment_fee,

      // Escrow
      escrow_agent_name: customFields?.escrow_agent_name,
      escrow_agent_address: customFields?.escrow_agent_address,
      escrow_officer: customFields?.escrow_officer,
      escrow_agent_email: customFields?.escrow_agent_email,

      // Terms
      close_of_escrow: customFields?.close_of_escrow,
      inspection_period: customFields?.inspection_period,
      personal_property: customFields?.personal_property,
      additional_terms: customFields?.additional_terms,

      // Section 1.10 closing amounts (all optional)
      escrow_fees_split: customFields?.escrow_fees_split,
      title_policy_paid_by: customFields?.title_policy_paid_by,
      hoa_fees_split: customFields?.hoa_fees_split,

      // Buyer signature and initials
      buyer_signature: customFields?.buyer_signature,
      buyer_initials: customFields?.buyer_initials,

      // AI Clauses
      ai_clauses: aiClausesHtml,
    }

    // Generate PDF from HTML template (pass company template ID to use custom template)
    const companyTemplateId = customFields?.company_template_id
    console.log(`[Send Contract] ===== STARTING CONTRACT SEND =====`)
    console.log(`[Send Contract] Company template ID: ${companyTemplateId || 'NONE'}`)
    console.log(`[Send Contract] Template type: ${templateType}`)
    console.log(`[Send Contract] Seller: ${sellerNameToSend} <${sellerEmailToSend}>`)
    console.log(`[Send Contract] Assignee: ${assigneeNameToSend} <${assigneeEmailToSend}>`)

    const { pdfBuffer, signatureLayout } = await pdfGenerator.generatePDF(templateType, contractData, companyTemplateId)
    console.log(`[Send Contract] PDF generated: ${pdfBuffer.length} bytes`)
    console.log(`[Send Contract] Signature layout from template: "${signatureLayout}" (type: ${typeof signatureLayout})`)

    // Get page count for signature positioning
    const pageCount = await pdfGenerator.getPageCount(pdfBuffer)
    console.log(`[Send Contract] PDF has ${pageCount} pages`)

    // Get signature field positions (including seller initials on each page)
    const signaturePositions = await pdfGenerator.getSignaturePositions(templateType, contractData, pageCount, signatureLayout)
    console.log(`[Send Contract] Got ${signaturePositions.length} signature positions:`)
    signaturePositions.forEach((pos, i) => {
      console.log(`[Send Contract]   Position ${i+1}: role=${pos.recipientRole}, type=${pos.fieldType}, page=${pos.page}, x=${pos.x}, y=${pos.y}`)
    })

    // For three-party templates, add both signers with signing order
    // Seller signs first (signingOrder: 1), then assignee (signingOrder: 2)
    // Documenso will only allow assignee to sign after seller completes
    // Check signature layout from template, not sendType
    const isThreePartyTemplate = signatureLayout === 'three-party'

    console.log(`[Send Contract] Three-party template: ${isThreePartyTemplate}`)

    // Validate we have the expected signature positions
    const sellerPositions = signaturePositions.filter(p => p.recipientRole === 'seller')
    const buyerPositions = signaturePositions.filter(p => p.recipientRole === 'buyer')
    console.log(`[Send Contract] Seller positions: ${sellerPositions.length}, Buyer positions: ${buyerPositions.length}`)

    if (sellerPositions.length === 0) {
      console.error(`[Send Contract] ERROR: No seller signature positions found!`)
      return NextResponse.json({
        error: 'No seller signature fields found. Please check template configuration.',
      }, { status: 500 })
    }

    if (isThreePartyTemplate && buyerPositions.length === 0) {
      console.error(`[Send Contract] ERROR: Three-party template but no buyer positions!`)
      return NextResponse.json({
        error: 'Three-party template requires buyer signature fields. Please check template configuration.',
      }, { status: 500 })
    }

    // Validate page numbers - all fields must be on valid pages
    const invalidPageFields = signaturePositions.filter(p => p.page < 1 || p.page > pageCount)
    if (invalidPageFields.length > 0) {
      console.error(`[Send Contract] ERROR: Fields on invalid pages:`, invalidPageFields)
      return NextResponse.json({
        error: `Signature fields on invalid pages (PDF has ${pageCount} pages but fields reference pages: ${invalidPageFields.map(f => f.page).join(', ')})`,
      }, { status: 500 })
    }

    // Prepare recipients based on template's signature layout
    const recipients = isThreePartyTemplate && assigneeEmailToSend
      ? [
          // Three-party: both seller and assignee
          {
            name: sellerNameToSend,
            email: sellerEmailToSend,
            role: 'SIGNER' as const,
            signingOrder: 1,
          },
          {
            name: assigneeNameToSend || 'Buyer',
            email: assigneeEmailToSend,
            role: 'SIGNER' as const,
            signingOrder: 2,
          },
        ]
      : [
          // Non-three-party: only seller
          {
            name: sellerNameToSend,
            email: sellerEmailToSend,
            role: 'SIGNER' as const,
            signingOrder: 1,
          },
        ]

    // Map signature positions to recipient emails
    console.log(`[Send Contract] Mapping ${signaturePositions.length} positions to recipients`)
    console.log(`[Send Contract] Seller email: ${sellerEmailToSend}, Assignee email: ${assigneeEmailToSend}`)

    const signatureFields = signaturePositions
      .map(pos => {
        const recipientEmail = pos.recipientRole === 'seller'
          ? sellerEmailToSend
          : assigneeEmailToSend || ''
        console.log(`[Send Contract] Position: role=${pos.recipientRole}, type=${pos.fieldType}, page=${pos.page} -> email=${recipientEmail}`)
        return {
          page: pos.page,
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          recipientEmail,
          fieldType: pos.fieldType as 'signature' | 'initials' | undefined,
        }
      })
      .filter(f => f.recipientEmail)

    // Log field counts per recipient
    const sellerFields = signatureFields.filter(f => f.recipientEmail === sellerEmailToSend)
    const assigneeFields = signatureFields.filter(f => f.recipientEmail === assigneeEmailToSend)
    console.log(`[Send Contract] Fields summary: ${sellerFields.length} for seller, ${assigneeFields.length} for assignee`)
    console.log(`[Send Contract] Seller fields:`, sellerFields.map(f => ({ page: f.page, type: f.fieldType, x: f.x, y: f.y })))
    console.log(`[Send Contract] Assignee fields:`, assigneeFields.map(f => ({ page: f.page, type: f.fieldType, x: f.x, y: f.y })))

    // Create document in Documenso with signatures
    // Format: contract::{uuid}::{type} - using :: as separator to avoid confusion with UUID dashes
    const externalId = `contract::${id}::${sendType}`
    console.log(`[Send Contract] Creating document in Documenso with externalId: ${externalId}`)
    console.log(`[Send Contract] Recipients:`, JSON.stringify(recipients, null, 2))

    const result = await documenso.createDocumentWithSignatures(pdfBuffer, {
      title: `${sendType === 'purchase' ? 'Purchase Agreement' : 'Assignment Contract'} - ${propertyAddress}`,
      externalId,
      recipients,
      signatureFields,
      sendImmediately: true,
    })

    console.log(`[Send Contract] Document created and sent: ${result.documentId}`)

    // Update contract status
    const { data: updated, error: updateError } = await adminSupabase
      .from('contracts')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        documenso_document_id: String(result.documentId),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update contract status:', updateError)
    }

    // Record status change
    await adminSupabase
      .from('contract_status_history')
      .insert({
        contract_id: id,
        status: 'sent',
        changed_by: user.id,
        metadata: {
          action: 'sent_for_signing',
          documenso_document_id: result.documentId,
          send_type: sendType,
          recipients: recipients.map(r => r.email),
          ai_clauses_used: requestedClauses || [],
          signing_urls: result.recipients.map(r => ({
            email: r.email,
            url: r.signingUrl,
          })),
          three_party: isThreePartyTemplate,
        },
      })

    // Increment contracts used this period
    await adminSupabase
      .from('companies')
      .update({
        contracts_used_this_period: (company?.contracts_used_this_period || 0) + 1,
      })
      .eq('id', userData.company_id)

    // Charge for overage if applicable
    let overageCharged = false
    if (isOverageContract && company?.stripe_customer_id && isStripeConfigured()) {
      const propertyAddr = customFields?.property_address || contract.property?.address || 'Unknown'
      const chargeResult = await chargeExtraContract(
        company.stripe_customer_id,
        actualPlan,
        `Extra contract: ${propertyAddr}`
      )
      overageCharged = !!chargeResult
      if (chargeResult) {
        console.log(`[Send Contract] Overage charged: ${chargeResult.id}`)
      }
    }

    // Get the plan-specific overage price for the response
    const plan = PLANS[actualPlan]
    const overagePrice = plan.limits.overagePricing.extraContractPrice

    return NextResponse.json({
      success: true,
      contract: updated,
      document: {
        id: result.documentId,
        recipients: result.recipients,
      },
      billing: {
        isOverage: isOverageContract,
        overageCharged,
        overageAmount: isOverageContract ? formatPrice(overagePrice) : null,
      },
    })
  } catch (error) {
    console.error('Send contract error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send contract' },
      { status: 500 }
    )
  }
}
