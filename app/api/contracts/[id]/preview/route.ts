import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { pdfGenerator, ContractData, TemplateType } from '@/lib/services/pdf-generator'
import { aiClauseService, ClauseType } from '@/lib/services/ai-clauses'
import { documenso } from '@/lib/documenso'

// GET /api/contracts/[id]/preview - Generate PDF preview or return signed document
export async function GET(
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

  // Get company details
  const { data: companyData } = await adminSupabase
    .from('companies')
    .select('name, email, phone, address, city, state, zip, signer_name')
    .eq('id', userData.company_id)
    .single()

  const company = companyData as {
    name: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zip?: string
    signer_name?: string
  } | null

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

  // Get query params
  const url = new URL(request.url)
  const type = url.searchParams.get('type') || 'purchase'
  const clausesParam = url.searchParams.get('clauses')
  const requestedClauses = clausesParam ? clausesParam.split(',') as ClauseType[] : []
  const wantSigned = url.searchParams.get('signed') === 'true'

  // If requesting signed document and contract has been sent to Documenso
  if (wantSigned && contract.documenso_document_id) {
    try {
      const customFieldsForDoc = contract.custom_fields as {
        documenso_seller_document_id?: string
        documenso_buyer_document_id?: string
        property_address?: string
        company_template_id?: string
        seller_signed_at?: string
      } | null

      // For three-party contracts, the buyer document contains both signatures
      // (seller signed first, then buyer signs on a document that includes seller's signature)
      const buyerDocId = customFieldsForDoc?.documenso_buyer_document_id
      const sellerDocId = customFieldsForDoc?.documenso_seller_document_id

      // Determine which document to download:
      // 1. If buyer document exists (three-party completed), use that (has both signatures)
      // 2. Otherwise use the main document ID
      let documentIdToDownload = contract.documenso_document_id

      if (buyerDocId) {
        // Three-party contract with buyer document - this has both signatures
        documentIdToDownload = buyerDocId
        console.log(`[Preview] Three-party contract: downloading buyer document (has both signatures): ${buyerDocId}`)
      } else if (sellerDocId) {
        // Three-party but buyer hasn't signed yet - show seller document
        documentIdToDownload = sellerDocId
        console.log(`[Preview] Three-party contract: downloading seller document: ${sellerDocId}`)
      } else {
        console.log(`[Preview] Downloading main document: ${contract.documenso_document_id}`)
      }

      const pdfBuffer = await documenso.downloadSignedDocumentBuffer(documentIdToDownload)

      const propertyAddress = customFieldsForDoc?.property_address ||
                              contract.property?.address || 'contract'

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${type}-${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}-signed.pdf"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      })
    } catch (downloadError) {
      console.error('[Preview] Failed to download signed document:', downloadError)
      // Fall through to generate preview if download fails
    }
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
    ai_clauses?: Array<{ id: string; title: string; content: string; editedContent?: string }>
    // Full document HTML override
    html_override?: string
    // Template references
    company_template_id?: string
    admin_template_id?: string
    purchase_template_id?: string
    assignment_template_id?: string
  } | null

  try {
    const templateType: TemplateType = type === 'purchase'
      ? 'purchase-agreement'
      : 'assignment-contract'

    const propertyAddress = customFields?.property_address || contract.property?.address || ''
    const propertyCity = customFields?.property_city || contract.property?.city || ''
    const propertyState = customFields?.property_state || contract.property?.state || ''
    const propertyZip = customFields?.property_zip || contract.property?.zip || ''

    // Generate AI clauses if requested (legacy method)
    let aiClausesHtml = ''
    if (requestedClauses.length > 0) {
      aiClausesHtml = await aiClauseService.generateClauses(
        requestedClauses.map(type => ({ type }))
      )
    }

    // Use saved AI clauses from custom_fields if available, otherwise use generated ones
    const aiClauses = customFields?.ai_clauses || aiClausesHtml || undefined

    // Build contract data
    const contractData: ContractData = {
      property_address: propertyAddress,
      property_city: propertyCity,
      property_state: propertyState,
      property_zip: propertyZip,
      apn: customFields?.apn,
      seller_name: contract.seller_name || '',
      seller_email: contract.seller_email || '',
      seller_phone: customFields?.seller_phone,
      seller_address: customFields?.seller_address,
      company_name: customFields?.company_name || '',
      company_email: customFields?.company_email || '',
      company_phone: customFields?.company_phone || '',
      company_signer_name: customFields?.company_signer_name || '',
      buyer_name: contract.buyer_name,
      buyer_email: contract.buyer_email,
      buyer_phone: customFields?.buyer_phone,
      // Assignee fields for three-party contracts
      assignee_name: contract.buyer_name,
      assignee_email: contract.buyer_email,
      assignee_phone: customFields?.buyer_phone,
      assignee_address: customFields?.assignee_address,
      purchase_price: contract.price || 0,
      earnest_money: customFields?.earnest_money,
      assignment_fee: customFields?.assignment_fee,
      escrow_agent_name: customFields?.escrow_agent_name,
      escrow_agent_address: customFields?.escrow_agent_address,
      escrow_officer: customFields?.escrow_officer,
      escrow_agent_email: customFields?.escrow_agent_email,
      close_of_escrow: customFields?.close_of_escrow,
      inspection_period: customFields?.inspection_period,
      personal_property: customFields?.personal_property,
      additional_terms: customFields?.additional_terms,
      ai_clauses: aiClauses,
      escrow_fees_split: customFields?.escrow_fees_split,
      title_policy_paid_by: customFields?.title_policy_paid_by,
      hoa_fees_split: customFields?.hoa_fees_split,
      buyer_signature: customFields?.buyer_signature,
      buyer_initials: customFields?.buyer_initials,
      html_override: customFields?.html_override,
    }

    // Collect non-standard custom_fields into extra_fields for arbitrary placeholder replacement
    const standardKeys = new Set([
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
      'html_override',
    ])

    if (customFields) {
      const extraFields: Record<string, string> = {}
      for (const [key, value] of Object.entries(customFields)) {
        if (!standardKeys.has(key) && value != null && typeof value !== 'object') {
          extraFields[key] = String(value)
        }
      }
      if (Object.keys(extraFields).length > 0) {
        contractData.extra_fields = extraFields
      }
    }

    // Generate PDF - use company template or admin template if available
    const companyTemplateId = customFields?.company_template_id
    const adminTemplateId = customFields?.admin_template_id
    console.log(`[Preview] Template IDs - company: ${companyTemplateId || 'NONE'}, admin: ${adminTemplateId || 'NONE'}`)
    const { pdfBuffer } = await pdfGenerator.generatePDF(templateType, contractData, companyTemplateId, adminTemplateId)

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${type}-${propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Preview generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preview' },
      { status: 500 }
    )
  }
}
