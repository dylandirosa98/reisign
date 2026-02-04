import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'
import { pdfGenerator, ContractData, TemplateType } from '@/lib/services/pdf-generator'
import { aiClauseService, ClauseType } from '@/lib/services/ai-clauses'
import { canCreateContract, PLANS, formatPrice } from '@/lib/plans'
import { chargeExtraContract, isStripeConfigured } from '@/lib/stripe'
import { sendSigningInviteEmail } from '@/lib/services/email'

// POST /api/contracts/[id]/send - Send contract for signing via Documenso
// For three-party contracts, this is called twice:
//   1. First call: sendTo='seller' - sends to seller only
//   2. After seller signs: sendTo='buyer' - sends to buyer/assignee
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

  // Get the body to determine which contract type to send and AI clauses
  const body = await request.json().catch(() => ({}))
  const sendType = body.type || 'purchase' // 'purchase' or 'assignment'
  const sendTo = body.sendTo as 'seller' | 'buyer' | undefined // For three-party: which party to send to
  const requestedClauses = body.clauses as ClauseType[] | undefined

  // Allow overriding signer info for sending (use provided values or fall back to contract values)
  const sellerNameToSend = (body.sellerName || contract.seller_name || '').trim()
  const sellerEmailToSend = (body.sellerEmail || contract.seller_email || '').trim()
  const sellerPhoneToSend = body.sellerPhone || (contract.custom_fields as Record<string, unknown>)?.seller_phone || ''
  const sellerAddressToSend = body.sellerAddress || (contract.custom_fields as Record<string, unknown>)?.seller_address || ''
  const assigneeNameToSend = (body.assigneeName || contract.buyer_name || '').trim()
  const assigneeEmailToSend = (body.assigneeEmail || contract.buyer_email || '').trim()
  const assigneePhoneToSend = body.assigneePhone || (contract.custom_fields as Record<string, unknown>)?.buyer_phone || ''
  const assigneeAddressToSend = body.assigneeAddress || (contract.custom_fields as Record<string, unknown>)?.assignee_address || ''

  // Validate required recipient fields before proceeding
  if (!sellerNameToSend) {
    return NextResponse.json({ error: 'Seller name is required before sending.' }, { status: 400 })
  }
  if (!sellerEmailToSend) {
    return NextResponse.json({ error: 'Seller email is required before sending.' }, { status: 400 })
  }

  const customFields = contract.custom_fields as {
    property_address?: string
    property_city?: string
    property_state?: string
    property_zip?: string
    assignment_fee?: number
    seller_phone?: string
    seller_address?: string
    buyer_phone?: string
    assignee_address?: string
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
    admin_template_id?: string
    // Three-party document IDs
    documenso_seller_document_id?: string
    documenso_buyer_document_id?: string
  } | null

  // Get the template to check signature layout (for three-party validation)
  let signatureLayoutFromDb: string | undefined
  if (customFields?.company_template_id) {
    const { data: templateData } = await adminSupabase
      .from('company_templates' as any)
      .select('signature_layout')
      .eq('id', customFields.company_template_id)
      .single()
    signatureLayoutFromDb = (templateData as any)?.signature_layout
  } else if (customFields?.admin_template_id) {
    const { data: templateData } = await adminSupabase
      .from('admin_templates')
      .select('signature_layout')
      .eq('id', customFields.admin_template_id)
      .single()
    signatureLayoutFromDb = (templateData as any)?.signature_layout
  }
  const isThreeParty = signatureLayoutFromDb === 'three-party'
  const isTwoSeller = signatureLayoutFromDb === 'two-seller'
  const isTwoStageSending = isThreeParty || isTwoSeller

  // Validate contract status based on what we're trying to do
  // Allow both 'draft' and 'ready' status for initial send (ready = wholesaler has signed)
  const canSendInitially = contract.status === 'draft' || contract.status === 'ready'

  if (isTwoStageSending) {
    // Two-stage has two stages: seller/seller1 first, then buyer/seller2
    if (sendTo === 'buyer') {
      // Sending to buyer/seller2 - contract should be in 'seller_signed' status
      // Also allow 'sent' or 'viewed' in case webhook didn't update status
      // (UI validates signing status from Documenso before showing button)
      const allowedStatuses = ['seller_signed', 'sent', 'viewed']
      if (!contract.status || !allowedStatuses.includes(contract.status)) {
        return NextResponse.json({
          error: `Cannot send to ${isTwoSeller ? 'Seller 2' : 'buyer'}. Current status: ` + contract.status,
        }, { status: 400 })
      }
    } else {
      // Sending to seller/seller1 (first stage) - must be draft or ready
      if (!canSendInitially) {
        return NextResponse.json({
          error: `Contract has already been sent to ${isTwoSeller ? 'Seller 1' : 'seller'}. Current status: ` + contract.status,
        }, { status: 400 })
      }
    }
  } else {
    // Non-two-stage: standard single send - must be draft or ready
    if (!canSendInitially) {
      return NextResponse.json({
        error: 'Contract has already been sent. Current status: ' + contract.status,
      }, { status: 400 })
    }
  }

  // Check contract limits (only for first send, not for buyer stage)
  const isFirstSend = canSendInitially
  if (isFirstSend) {
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
  }

  // Track if this is an overage contract for billing
  const actualPlan = company?.actual_plan || 'free'
  const contractsUsed = company?.contracts_used_this_period || 0
  const limitCheck = canCreateContract(actualPlan, contractsUsed)
  const isOverageContract = isFirstSend && limitCheck.isOverage === true

  // Wholesaler signature is now optional - contracts can be sent without it
  // The signature will be added by a manager later
  // Only log if signature is missing for debugging
  if (!customFields?.buyer_signature) {
    console.log(`[Send Contract] Contract ${id} being sent without wholesaler signature - signature will be added by manager later`)
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

    // Generate AI clauses if requested (only on first send)
    let aiClausesHtml = ''
    if (isFirstSend && requestedClauses && requestedClauses.length > 0) {
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
      seller_address: sellerAddressToSend || customFields?.seller_address,

      // Company (Buyer on Purchase Agreement) - only use explicitly saved values
      company_name: customFields?.company_name || '',
      company_email: customFields?.company_email || '',
      company_phone: customFields?.company_phone || '',
      company_signer_name: customFields?.company_signer_name || '',

      // End Buyer/Assignee (Assignment Contract) - use send-to values which may override contract values
      buyer_name: assigneeNameToSend,
      buyer_email: assigneeEmailToSend,
      buyer_phone: assigneePhoneToSend || customFields?.buyer_phone,

      // Also set assignee fields for three-party template
      assignee_name: assigneeNameToSend,
      assignee_email: assigneeEmailToSend,
      assignee_phone: assigneePhoneToSend || customFields?.buyer_phone,
      assignee_address: assigneeAddressToSend || customFields?.assignee_address,

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

    // Collect non-standard custom_fields into extra_fields for arbitrary placeholder replacement
    const standardCustomKeys = new Set([
      'property_address', 'property_city', 'property_state', 'property_zip',
      'assignment_fee', 'seller_phone', 'seller_address', 'buyer_phone',
      'assignee_address', 'earnest_money', 'escrow_agent_name', 'escrow_agent_address',
      'escrow_officer', 'escrow_agent_email', 'close_of_escrow', 'inspection_period',
      'apn', 'personal_property', 'additional_terms', 'escrow_fees_split',
      'title_policy_paid_by', 'hoa_fees_split', 'company_name', 'company_signer_name',
      'company_email', 'company_phone', 'buyer_signature', 'buyer_initials',
      'ai_clauses', 'company_template_id', 'admin_template_id',
      'purchase_template_id', 'assignment_template_id', 'contract_type',
      'documenso_seller_document_id', 'documenso_buyer_document_id', 'seller_signed_at',
    ])

    if (customFields) {
      const extraFields: Record<string, string> = {}
      for (const [key, value] of Object.entries(customFields)) {
        if (!standardCustomKeys.has(key) && value != null && typeof value !== 'object') {
          extraFields[key] = String(value)
        }
      }
      if (Object.keys(extraFields).length > 0) {
        contractData.extra_fields = extraFields
      }
    }

    // Generate PDF from HTML template (pass company/admin template ID to use custom template)
    const companyTemplateId = customFields?.company_template_id
    const adminTemplateId = customFields?.admin_template_id
    console.log(`[Send Contract] ===== STARTING CONTRACT SEND =====`)
    console.log(`[Send Contract] Company template ID: ${companyTemplateId || 'NONE'}`)
    console.log(`[Send Contract] Admin template ID: ${adminTemplateId || 'NONE'}`)
    console.log(`[Send Contract] Template type: ${templateType}`)
    console.log(`[Send Contract] Three-party: ${isThreeParty}, Two-seller: ${isTwoSeller}, Two-stage: ${isTwoStageSending}, sendTo: ${sendTo || 'default'}`)
    console.log(`[Send Contract] Seller: ${sellerNameToSend} <${sellerEmailToSend}> | Phone: ${sellerPhoneToSend} | Address: ${sellerAddressToSend}`)
    console.log(`[Send Contract] Assignee: ${assigneeNameToSend} <${assigneeEmailToSend}> | Phone: ${assigneePhoneToSend} | Address: ${assigneeAddressToSend}`)
    console.log(`[Send Contract] Body received:`, JSON.stringify({ sellerName: body.sellerName, sellerEmail: body.sellerEmail, sellerPhone: body.sellerPhone, sellerAddress: body.sellerAddress, assigneeName: body.assigneeName, assigneeEmail: body.assigneeEmail, assigneePhone: body.assigneePhone, assigneeAddress: body.assigneeAddress }))

    let pdfBuffer: Buffer
    let signatureLayout: string | undefined

    // For two-stage buyer/seller2 stage, download the signed seller/seller1 PDF from Documenso
    // This way the second signer sees the first signer's signatures on their document
    if (isTwoStageSending && sendTo === 'buyer') {
      // Try documenso_seller_document_id first, fallback to main documenso_document_id
      const sellerDocId = (customFields?.documenso_seller_document_id as string | undefined) ||
                          contract.documenso_document_id
      if (!sellerDocId) {
        return NextResponse.json({
          error: 'Seller document ID not found. Please send to seller first.',
        }, { status: 400 })
      }

      console.log(`[Send Contract] Downloading signed seller PDF from Documenso (doc ID: ${sellerDocId})`)
      console.log(`[Send Contract] documenso_seller_document_id: ${customFields?.documenso_seller_document_id}`)
      console.log(`[Send Contract] contract.documenso_document_id: ${contract.documenso_document_id}`)
      try {
        pdfBuffer = await documenso.downloadSignedDocumentBuffer(sellerDocId)
        console.log(`[Send Contract] Downloaded signed seller PDF: ${pdfBuffer.length} bytes`)
      } catch (downloadError) {
        console.error(`[Send Contract] Failed to download signed seller PDF:`, downloadError)
        // If download fails, generate a fresh PDF as fallback (without seller signatures)
        console.log(`[Send Contract] Falling back to generating fresh PDF`)
        const result = await pdfGenerator.generatePDF(templateType, contractData, companyTemplateId, adminTemplateId)
        pdfBuffer = result.pdfBuffer
        signatureLayout = result.signatureLayout
      }

      // If we downloaded the signed PDF, still need to get signatureLayout from template
      if (!signatureLayout) {
        const { signatureLayout: layout } = await pdfGenerator.generatePDF(templateType, contractData, companyTemplateId, adminTemplateId)
        signatureLayout = layout
      }
    } else {
      // Generate fresh PDF for seller or non-three-party contracts
      const result = await pdfGenerator.generatePDF(templateType, contractData, companyTemplateId, adminTemplateId)
      pdfBuffer = result.pdfBuffer
      signatureLayout = result.signatureLayout
    }

    console.log(`[Send Contract] PDF ready: ${pdfBuffer.length} bytes`)
    console.log(`[Send Contract] Signature layout from template: "${signatureLayout}"`)

    // Get page count for signature positioning
    const pageCount = await pdfGenerator.getPageCount(pdfBuffer)
    console.log(`[Send Contract] PDF has ${pageCount} pages`)

    // For THREE-PARTY contracts, we use a TWO-DOCUMENT approach:
    // 1. First document: Send to seller with seller-only fields
    // 2. Second document: Send to buyer with buyer-only fields (after seller signs)
    // Use isTwoStageSending (from DB) as source of truth, fallback to PDF generator layout
    const isThreePartyTemplate = isTwoStageSending || signatureLayout === 'three-party' || signatureLayout === 'two-seller'

    console.log(`[Send Contract] isTwoStageSending (from DB): ${isTwoStageSending}`)
    console.log(`[Send Contract] isThreePartyTemplate (combined): ${isThreePartyTemplate}`)

    // Determine which layout to use for signature positions
    // For three-party, we create single-party documents
    let effectiveLayout: string
    let recipientName: string
    let recipientEmail: string
    let documentTitle: string

    if (isThreePartyTemplate) {
      // Use three-party layout for signature positions (two-seller uses same coordinates)
      effectiveLayout = 'three-party'
      if (sendTo === 'buyer') {
        // Second stage: sending to buyer/seller2 only
        recipientName = assigneeNameToSend || (isTwoSeller ? 'Seller 2' : 'Buyer')
        recipientEmail = assigneeEmailToSend
        documentTitle = isTwoSeller
          ? `Purchase Agreement (Seller 2) - ${propertyAddress}`
          : `Assignment Contract (Buyer) - ${propertyAddress}`
      } else {
        // First stage: sending to seller/seller1 only
        recipientName = sellerNameToSend
        recipientEmail = sellerEmailToSend
        documentTitle = isTwoSeller
          ? `Purchase Agreement (Seller 1) - ${propertyAddress}`
          : `Assignment Contract (Seller) - ${propertyAddress}`
      }
    } else {
      // Non-three-party: use the template's layout as-is
      effectiveLayout = signatureLayout || 'two-column'
      recipientName = sellerNameToSend
      recipientEmail = sellerEmailToSend
      documentTitle = `${sendType === 'purchase' ? 'Purchase Agreement' : 'Assignment Contract'} - ${propertyAddress}`
    }

    console.log(`[Send Contract] Effective layout: ${effectiveLayout}`)
    console.log(`[Send Contract] Recipient: ${recipientName} <${recipientEmail}>`)

    // Get signature field positions for the effective layout
    const signaturePositions = await pdfGenerator.getSignaturePositions(templateType, contractData, pageCount, effectiveLayout)
    console.log(`[Send Contract] Got ${signaturePositions.length} signature positions`)

    // For three-party layout, filter positions based on who we're sending to
    // Seller gets 'seller' role positions, buyer gets 'buyer' role positions
    const targetRole = (isThreePartyTemplate && sendTo === 'buyer') ? 'buyer' : 'seller'
    const filteredPositions = isThreePartyTemplate
      ? signaturePositions.filter(pos => pos.recipientRole === targetRole)
      : signaturePositions

    console.log(`[Send Contract] Filtered to ${filteredPositions.length} positions for role: ${targetRole}`)

    const signatureFields = filteredPositions.map(pos => ({
      page: pos.page,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
      recipientEmail: recipientEmail,
      fieldType: pos.fieldType as 'signature' | 'initials' | 'date' | undefined,
    }))

    console.log(`[Send Contract] Mapped ${signatureFields.length} fields to ${recipientEmail}`)

    if (signatureFields.length === 0) {
      return NextResponse.json({
        error: 'No signature fields could be created. Please check template configuration.',
      }, { status: 500 })
    }

    // Single recipient for each document
    const recipients = [{
      name: recipientName,
      email: recipientEmail,
      role: 'SIGNER' as const,
      signingOrder: 1,
    }]

    // Create document in Documenso with signatures
    // Format: contract::{uuid}::{type}::{party} for three-party
    const externalIdSuffix = isThreePartyTemplate ? `::${sendTo || 'seller'}` : ''
    const externalId = `contract::${id}::${sendType}${externalIdSuffix}`
    console.log(`[Send Contract] Creating document in Documenso with externalId: ${externalId}`)

    // Build redirect URL for after signing
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.reisign.com'
    const redirectUrl = `${appUrl}/signing-complete?contractId=${id}`
    console.log(`[Send Contract] Redirect URL after signing: ${redirectUrl}`)

    const result = await documenso.createDocumentWithSignatures(pdfBuffer, {
      title: documentTitle,
      externalId,
      recipients,
      signatureFields,
      sendImmediately: true,
      redirectUrl,
    })

    console.log(`[Send Contract] Document created and sent: ${result.documentId}`)

    // Determine new status
    let newStatus: string
    if (isThreePartyTemplate) {
      if (sendTo === 'buyer') {
        newStatus = 'buyer_pending' // Waiting for buyer to sign
      } else {
        newStatus = 'sent' // Waiting for seller to sign (first stage)
      }
    } else {
      newStatus = 'sent'
    }

    // Update contract status and store document ID
    // For three-party, we store both document IDs in custom_fields
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (isThreePartyTemplate) {
      if (sendTo === 'buyer') {
        // Store buyer document ID
        updateData.custom_fields = {
          ...customFields,
          documenso_buyer_document_id: String(result.documentId),
        }
      } else {
        // First send - store seller document ID
        updateData.sent_at = new Date().toISOString()
        updateData.documenso_document_id = String(result.documentId)
        updateData.custom_fields = {
          ...customFields,
          documenso_seller_document_id: String(result.documentId),
        }
      }
    } else {
      updateData.sent_at = new Date().toISOString()
      updateData.documenso_document_id = String(result.documentId)
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from('contracts')
      .update(updateData)
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
        status: newStatus,
        changed_by: user.id,
        metadata: {
          action: isThreePartyTemplate
            ? (sendTo === 'buyer' ? 'sent_to_buyer' : 'sent_to_seller')
            : 'sent_for_signing',
          documenso_document_id: result.documentId,
          send_type: sendType,
          recipient: recipientEmail,
          ai_clauses_used: requestedClauses || [],
          signing_url: result.recipients[0]?.signingUrl,
          three_party: isThreePartyTemplate,
          three_party_stage: isThreePartyTemplate ? (sendTo || 'seller') : undefined,
        },
      })

    // Send custom signing invite email
    const signingUrl = result.recipients[0]?.signingUrl
    if (signingUrl && recipientEmail) {
      try {
        const signerRole = isThreePartyTemplate
          ? (sendTo === 'buyer' ? 'buyer' : 'seller')
          : undefined

        await sendSigningInviteEmail({
          to: recipientEmail,
          recipientName: recipientName,
          companyName: company?.name || 'REI Sign',
          propertyAddress: propertyAddress,
          signingUrl: signingUrl,
          contractType: sendType as 'purchase' | 'assignment',
          isThreeParty: isThreePartyTemplate,
          signerRole: signerRole as 'seller' | 'buyer' | undefined,
        })
        console.log(`[Send Contract] Custom signing invite email sent to ${recipientEmail}`)
      } catch (emailError) {
        // Don't fail the send if email fails
        console.error('[Send Contract] Failed to send custom signing invite email:', emailError)
      }
    }

    // Increment contracts used this period (only on first send)
    if (isFirstSend) {
      await adminSupabase
        .from('companies')
        .update({
          contracts_used_this_period: (company?.contracts_used_this_period || 0) + 1,
        })
        .eq('id', userData.company_id)

      // Charge for overage if applicable
      if (isOverageContract && company?.stripe_customer_id && isStripeConfigured()) {
        const propertyAddr = customFields?.property_address || contract.property?.address || 'Unknown'
        const chargeResult = await chargeExtraContract(
          company.stripe_customer_id,
          actualPlan,
          `Extra contract: ${propertyAddr}`
        )
        if (chargeResult) {
          console.log(`[Send Contract] Overage charged: ${chargeResult.id}`)
        }
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
      billing: isFirstSend ? {
        isOverage: isOverageContract,
        overageCharged: isOverageContract,
        overageAmount: isOverageContract ? formatPrice(overagePrice) : null,
      } : undefined,
      threeParty: isThreePartyTemplate ? {
        stage: sendTo || 'seller',
        nextStage: sendTo === 'buyer' ? null : 'buyer',
      } : undefined,
    })
  } catch (error) {
    console.error('Send contract error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send contract' },
      { status: 500 }
    )
  }
}
