import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { CompanyTemplate, CustomField, TemplateFieldConfig } from '@/types/database'

// Standard placeholders that can be used in templates
export const STANDARD_PLACEHOLDERS = {
  // Property fields
  property_address: { label: 'Property Address', category: 'Property' },
  property_city: { label: 'Property City', category: 'Property' },
  property_state: { label: 'Property State', category: 'Property' },
  property_zip: { label: 'Property ZIP', category: 'Property' },
  full_property_address: { label: 'Full Property Address', category: 'Property' },
  apn: { label: 'APN (Parcel Number)', category: 'Property' },

  // Seller fields
  seller_name: { label: 'Seller Name', category: 'Seller' },
  seller_email: { label: 'Seller Email', category: 'Seller' },
  seller_phone: { label: 'Seller Phone', category: 'Seller' },
  seller_address: { label: 'Seller Address', category: 'Seller' },

  // Company/Buyer fields
  company_name: { label: 'Company Name', category: 'Company' },
  company_email: { label: 'Company Email', category: 'Company' },
  company_phone: { label: 'Company Phone', category: 'Company' },
  company_address: { label: 'Company Address', category: 'Company' },
  company_signer_name: { label: 'Company Signer Name', category: 'Company' },

  // Assignee fields (for assignments)
  assignee_name: { label: 'Assignee Name', category: 'Assignee' },
  assignee_email: { label: 'Assignee Email', category: 'Assignee' },
  assignee_phone: { label: 'Assignee Phone', category: 'Assignee' },
  assignee_address: { label: 'Assignee Address', category: 'Assignee' },

  // Price fields
  purchase_price: { label: 'Purchase Price', category: 'Financial' },
  earnest_money: { label: 'Earnest Money', category: 'Financial' },
  assignment_fee: { label: 'Assignment Fee', category: 'Financial' },

  // Escrow fields
  escrow_agent_name: { label: 'Escrow Agent Name', category: 'Escrow' },
  escrow_agent_address: { label: 'Escrow Agent Address', category: 'Escrow' },
  escrow_officer: { label: 'Escrow Officer', category: 'Escrow' },
  escrow_agent_email: { label: 'Escrow Agent Email', category: 'Escrow' },

  // Terms
  close_of_escrow: { label: 'Close of Escrow Date', category: 'Terms' },
  inspection_period: { label: 'Inspection Period (days)', category: 'Terms' },
  personal_property: { label: 'Personal Property Included', category: 'Terms' },
  additional_terms: { label: 'Additional Terms', category: 'Terms' },

  // AI & Generated
  ai_clauses: { label: 'AI-Generated Clauses', category: 'Generated' },
  contract_date: { label: 'Contract Date', category: 'Generated' },
}

// Extract placeholders from HTML content
function extractPlaceholders(html: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const matches = html.matchAll(regex)
  const placeholders = new Set<string>()

  for (const match of matches) {
    placeholders.add(match[1])
  }

  return Array.from(placeholders)
}

// All standard form field keys that can be configured
const ALL_STANDARD_FIELDS = [
  'property_address', 'property_city', 'property_state', 'property_zip', 'apn',
  'seller_name', 'seller_email', 'seller_phone', 'seller_address',
  'buyer_name', 'buyer_email', 'buyer_phone',
  'purchase_price', 'earnest_money', 'assignment_fee',
  'escrow_agent_name', 'escrow_agent_address', 'escrow_officer', 'escrow_agent_email',
  'close_of_escrow', 'inspection_period', 'personal_property', 'additional_terms',
  'escrow_fees_split', 'title_policy_paid_by', 'hoa_fees_split',
] as const

// Fields that should always be required when visible
const REQUIRED_WHEN_VISIBLE = [
  'property_address', 'property_city', 'property_state', 'property_zip',
  'seller_name', 'seller_email', 'purchase_price',
]

// Map template placeholders to form field names (most are 1:1, but some differ)
const PLACEHOLDER_TO_FIELD_MAP: Record<string, string> = {
  // Direct mappings (placeholder name = field name)
  property_address: 'property_address',
  property_city: 'property_city',
  property_state: 'property_state',
  property_zip: 'property_zip',
  apn: 'apn',
  seller_name: 'seller_name',
  seller_email: 'seller_email',
  seller_phone: 'seller_phone',
  seller_address: 'seller_address',
  buyer_name: 'buyer_name',
  buyer_email: 'buyer_email',
  buyer_phone: 'buyer_phone',
  purchase_price: 'purchase_price',
  earnest_money: 'earnest_money',
  assignment_fee: 'assignment_fee',
  escrow_agent_name: 'escrow_agent_name',
  escrow_agent_address: 'escrow_agent_address',
  escrow_officer: 'escrow_officer',
  escrow_agent_email: 'escrow_agent_email',
  close_of_escrow: 'close_of_escrow',
  inspection_period: 'inspection_period',
  personal_property: 'personal_property',
  additional_terms: 'additional_terms',
  // Checkbox fields (detected by their check variants)
  escrow_fees_split_check: 'escrow_fees_split',
  escrow_fees_buyer_check: 'escrow_fees_split',
  title_policy_seller_check: 'title_policy_paid_by',
  title_policy_buyer_check: 'title_policy_paid_by',
  hoa_fees_split_check: 'hoa_fees_split',
  hoa_fees_buyer_check: 'hoa_fees_split',
  // Computed/composite fields map to their base fields
  full_property_address: 'property_address', // If full_property_address used, need individual fields
  // Assignee fields map to buyer fields (for three-party)
  assignee_name: 'buyer_name',
  assignee_email: 'buyer_email',
  assignee_phone: 'buyer_phone',
  assignee_address: 'buyer_phone', // No separate field, just use buyer section
}

// Auto-generate field_config based on placeholders used in the template
function generateFieldConfig(usedPlaceholders: string[]): TemplateFieldConfig {
  // Convert used placeholders to field names
  const usedFields = new Set<string>()

  for (const placeholder of usedPlaceholders) {
    const fieldName = PLACEHOLDER_TO_FIELD_MAP[placeholder]
    if (fieldName) {
      usedFields.add(fieldName)
    }
  }

  // If full_property_address is used, also need city/state/zip
  if (usedPlaceholders.includes('full_property_address')) {
    usedFields.add('property_city')
    usedFields.add('property_state')
    usedFields.add('property_zip')
  }

  // Generate standardFields config
  const standardFields: Record<string, { visible: boolean; required: boolean }> = {}

  for (const field of ALL_STANDARD_FIELDS) {
    const isVisible = usedFields.has(field)
    const isRequired = isVisible && REQUIRED_WHEN_VISIBLE.includes(field)
    standardFields[field] = { visible: isVisible, required: isRequired }
  }

  return { standardFields }
}

// GET - List all templates for the user's company
export async function GET(request: NextRequest) {
  try {
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

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const includeExamples = searchParams.get('includeExamples') !== 'false'

    // Build query
    let query = adminSupabase
      .from('company_templates' as any)
      .select('*')
      .eq('is_active', true)

    // Filter by company or examples
    if (includeExamples) {
      query = query.or(`company_id.eq.${userData.company_id},is_example.eq.true`)
    } else {
      query = query.eq('company_id', userData.company_id)
    }

    // Filter by tag
    if (tag) {
      query = query.contains('tags', [tag])
    }

    // Search by name or description
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    query = query.order('created_at', { ascending: false })

    const { data: templates, error } = await query

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    // Get all unique tags for filtering
    const { data: allTemplatesData } = await adminSupabase
      .from('company_templates' as any)
      .select('tags')
      .or(`company_id.eq.${userData.company_id},is_example.eq.true`)
      .eq('is_active', true)

    const allTemplates = allTemplatesData as Array<{ tags: string[] | null }> | null

    const allTags = new Set<string>()
    allTemplates?.forEach((t) => {
      t.tags?.forEach(tag => allTags.add(tag))
    })

    return NextResponse.json({
      templates: templates || [],
      availableTags: Array.from(allTags).sort(),
      standardPlaceholders: STANDARD_PLACEHOLDERS,
    })
  } catch (error) {
    console.error('Error in GET /api/company-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()
    const {
      name,
      description,
      tags,
      html_content,
      signature_layout,
      custom_fields,
      field_config,
    } = body as {
      name: string
      description?: string
      tags?: string[]
      html_content: string
      signature_layout: string
      custom_fields?: CustomField[]
      field_config?: TemplateFieldConfig
    }

    // Validate required fields
    if (!name || !html_content) {
      return NextResponse.json(
        { error: 'Name and HTML content are required' },
        { status: 400 }
      )
    }

    // Extract placeholders from HTML
    const used_placeholders = extractPlaceholders(html_content)

    // Auto-generate field_config based on placeholders used in template
    // This ensures only fields that appear in the template are shown in the form
    const autoFieldConfig = generateFieldConfig(used_placeholders)

    // Create template
    const { data: template, error } = await adminSupabase
      .from('company_templates' as any)
      .insert({
        company_id: userData.company_id,
        created_by: user.id,
        name,
        description: description || null,
        tags: tags || [],
        html_content,
        signature_layout: signature_layout || 'two-column',
        custom_fields: custom_fields || [],
        used_placeholders,
        field_config: autoFieldConfig, // Use auto-generated config instead of passed config
        is_example: false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in POST /api/company-templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
