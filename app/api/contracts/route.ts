import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'
import { checkContractCreation, incrementContractCount, logUsage } from '@/lib/services/plan-enforcement'

interface CreateContractRequest {
  templateId?: string // Company template ID - if provided, uses this template instead of state template
  property: {
    address: string
    city: string
    state: string
    zip: string
  }
  seller: {
    name: string
    email: string
    phone?: string
  }
  buyer?: {
    name?: string
    email?: string
    phone?: string
  }
  contract: {
    purchasePrice: number
    assignmentFee?: number
    contractType: 'purchase' | 'assignment' | 'both'
  }
  customFields?: {
    apn?: string
    seller_address?: string
    earnest_money?: number
    escrow_agent_name?: string
    escrow_agent_address?: string
    escrow_officer?: string
    escrow_agent_email?: string
    close_of_escrow?: string
    inspection_period?: string
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
  }
}

// GET /api/contracts - List contracts for the user's company
export async function GET() {
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

  // Get contracts
  const { data: contracts, error } = await adminSupabase
    .from('contracts')
    .select(`
      *,
      property:properties(id, address, city, state, zip)
    `)
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(contracts)
}

// POST /api/contracts - Create a new contract
export async function POST(request: NextRequest) {
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

  const body: CreateContractRequest = await request.json()
  const { templateId, property, seller, buyer, contract, customFields } = body

  console.log('[Create Contract] Request body:', JSON.stringify({ templateId, property, seller, buyer, contract, customFields: customFields ? 'present' : 'missing' }, null, 2))

  // Validate required fields (only property, seller, and price are required)
  if (!property.address || !property.city || !property.state || !property.zip) {
    return NextResponse.json({ error: 'Property details are required' }, { status: 400 })
  }

  if (!seller.name || !seller.email) {
    return NextResponse.json({ error: 'Seller details are required' }, { status: 400 })
  }

  if (!contract.purchasePrice) {
    return NextResponse.json({ error: 'Purchase price is required' }, { status: 400 })
  }

  try {
    // Check plan limits before creating contract
    const enforcementResult = await checkContractCreation(userData.company_id)
    if (!enforcementResult.allowed) {
      return NextResponse.json(
        {
          error: enforcementResult.reason || 'Contract limit reached',
          upgradeRequired: enforcementResult.upgradeRequired,
          suggestedPlan: enforcementResult.suggestedPlan,
        },
        { status: 403 }
      )
    }

    // Log that we're allowing the contract (may have overage)
    if (enforcementResult.overagePrice) {
      console.log(`[Create Contract] Overage contract - will be charged ${enforcementResult.overagePrice} cents`)
    }

    // 1. Create or find the property
    const { data: existingProperty } = await adminSupabase
      .from('properties')
      .select('id')
      .eq('company_id', userData.company_id)
      .eq('address', property.address)
      .eq('city', property.city)
      .eq('state', property.state)
      .single()

    let propertyId: string

    if (existingProperty) {
      propertyId = existingProperty.id
    } else {
      const { data: newProperty, error: propertyError } = await adminSupabase
        .from('properties')
        .insert({
          company_id: userData.company_id,
          address: property.address,
          city: property.city,
          state: property.state,
          zip: property.zip,
        })
        .select()
        .single()

      if (propertyError || !newProperty) {
        console.error('[Create Contract] Property creation error:', propertyError)
        return NextResponse.json({ error: 'Failed to create property: ' + propertyError?.message }, { status: 500 })
      }

      propertyId = newProperty.id
    }

    // 2. Get the appropriate template
    // If a company template ID is provided, use that template
    // Otherwise, fall back to state-specific or general templates
    let companyTemplateId: string | null = templateId || null
    let purchaseTemplateId: string | null = null
    let assignmentTemplateId: string | null = null

    if (companyTemplateId) {
      // Validate the company template exists and belongs to this company OR is an example template
      const { data: companyTemplateData, error: templateError } = await adminSupabase
        .from('company_templates' as any)
        .select('id, name, html_content, is_example')
        .eq('id', companyTemplateId)
        .or(`company_id.eq.${userData.company_id},is_example.eq.true`)
        .single()

      const companyTemplate = companyTemplateData as { id: string; name: string; html_content: string; is_example: boolean } | null

      if (templateError || !companyTemplate) {
        console.error('[Create Contract] Company template not found:', templateError)
        return NextResponse.json({
          error: 'Selected template not found or does not belong to your company.',
        }, { status: 400 })
      }

      console.log('[Create Contract] Using company template:', companyTemplate.name, companyTemplate.is_example ? '(example)' : '')
    } else {
      // Fall back to state-based templates
      const { data: stateTemplate } = await adminSupabase
        .from('state_templates')
        .select('*')
        .eq('state_code', property.state)
        .single()

      const { data: generalTemplate } = await adminSupabase
        .from('state_templates')
        .select('*')
        .eq('state_code', 'GENERAL')
        .single()

      if (stateTemplate && !stateTemplate.use_general_template) {
        // Use state-specific template
        purchaseTemplateId = stateTemplate.purchase_agreement_template_id
        assignmentTemplateId = stateTemplate.assignment_contract_template_id
      }

      // Fall back to general template
      if (!purchaseTemplateId && generalTemplate) {
        purchaseTemplateId = generalTemplate.purchase_agreement_template_id
      }
      if (!assignmentTemplateId && generalTemplate) {
        assignmentTemplateId = generalTemplate.assignment_contract_template_id
      }

      // Check if we have the required templates (only when not using company template)
      if (contract.contractType === 'purchase' || contract.contractType === 'both') {
        if (!purchaseTemplateId) {
          return NextResponse.json({
            error: 'No purchase agreement template configured for this state. Please contact support.',
          }, { status: 400 })
        }
      }

      if (contract.contractType === 'assignment' || contract.contractType === 'both') {
        if (!assignmentTemplateId) {
          return NextResponse.json({
            error: 'No assignment contract template configured for this state. Please contact support.',
          }, { status: 400 })
        }
      }
    }

    // 3. Create the contract record
    const { data: newContract, error: contractError } = await adminSupabase
      .from('contracts')
      .insert({
        company_id: userData.company_id,
        property_id: propertyId,
        created_by: user.id,
        buyer_name: buyer?.name || '',
        buyer_email: buyer?.email || '',
        seller_name: seller.name,
        seller_email: seller.email,
        price: contract.purchasePrice,
        status: 'draft',
        custom_fields: {
          // Basic fields
          buyer_phone: buyer?.phone || null,
          seller_phone: seller.phone || null,
          assignment_fee: contract.assignmentFee || 0,
          contract_type: contract.contractType,
          // Template references - company template takes priority
          company_template_id: companyTemplateId,
          purchase_template_id: purchaseTemplateId,
          assignment_template_id: assignmentTemplateId,
          // Property fields
          property_address: property.address,
          property_city: property.city,
          property_state: property.state,
          property_zip: property.zip,
          apn: customFields?.apn || null,
          // Seller fields
          seller_address: customFields?.seller_address || null,
          // Escrow fields
          earnest_money: customFields?.earnest_money || null,
          escrow_agent_name: customFields?.escrow_agent_name || null,
          escrow_agent_address: customFields?.escrow_agent_address || null,
          escrow_officer: customFields?.escrow_officer || null,
          escrow_agent_email: customFields?.escrow_agent_email || null,
          // Terms
          close_of_escrow: customFields?.close_of_escrow || null,
          inspection_period: customFields?.inspection_period || null,
          personal_property: customFields?.personal_property || null,
          additional_terms: customFields?.additional_terms || null,
          // Section 1.10 closing amounts
          escrow_fees_split: customFields?.escrow_fees_split || null,
          title_policy_paid_by: customFields?.title_policy_paid_by || null,
          hoa_fees_split: customFields?.hoa_fees_split || null,
          // Company/Buyer signing fields
          company_name: customFields?.company_name || null,
          company_signer_name: customFields?.company_signer_name || null,
          company_email: customFields?.company_email || null,
          company_phone: customFields?.company_phone || null,
          buyer_signature: customFields?.buyer_signature || null,
          buyer_initials: customFields?.buyer_initials || null,
        },
      })
      .select()
      .single()

    if (contractError || !newContract) {
      console.error('[Create Contract] Contract creation error:', contractError)
      return NextResponse.json({ error: 'Failed to create contract: ' + contractError?.message }, { status: 500 })
    }

    // 4. Record status change
    await adminSupabase
      .from('contract_status_history')
      .insert({
        contract_id: newContract.id,
        status: 'draft',
        changed_by: user.id,
        metadata: { action: 'created' },
      })

    // 5. Increment contract count for billing
    const newCount = await incrementContractCount(userData.company_id)
    console.log(`[Create Contract] Contract count updated to ${newCount}`)

    // 6. Log usage for analytics
    await logUsage(userData.company_id, user.id, 'contract_created', {
      contractId: newContract.id,
      contractType: contract.contractType,
      hasOverage: !!enforcementResult.overagePrice,
    })

    return NextResponse.json({
      success: true,
      contract: newContract,
      templateInfo: {
        companyTemplateId,
        purchaseTemplateId,
        assignmentTemplateId,
        usingCompanyTemplate: !!companyTemplateId,
      },
    })
  } catch (error) {
    console.error('Contract creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create contract' },
      { status: 500 }
    )
  }
}
