import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'

// Helper function to verify admin access
async function verifyAdminAccess() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }

  const { data: userData } = await adminSupabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    return { error: 'Admin access required', status: 403 }
  }

  return { user, adminSupabase }
}

// POST /api/templates/[stateCode] - Upload a template for a state (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  const authResult = await verifyAdminAccess()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { stateCode } = await params
  const supabase = authResult.adminSupabase

  const formData = await request.formData()
  const file = formData.get('file') as File
  const templateType = formData.get('templateType') as 'purchase' | 'assignment'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!templateType || !['purchase', 'assignment'].includes(templateType)) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
  }

  // Get state template record
  const { data: stateTemplate, error: fetchError } = await supabase
    .from('state_templates')
    .select('*')
    .eq('state_code', stateCode)
    .single()

  if (fetchError || !stateTemplate) {
    return NextResponse.json({ error: 'State not found' }, { status: 404 })
  }

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer())
  const title = `${stateTemplate.state_name} - ${templateType === 'purchase' ? 'Purchase Agreement' : 'Assignment Contract'}`

  try {
    // Delete old template if exists
    const oldTemplateId = templateType === 'purchase'
      ? stateTemplate.purchase_agreement_template_id
      : stateTemplate.assignment_contract_template_id

    if (oldTemplateId) {
      try {
        await documenso.deleteTemplate(oldTemplateId)
      } catch {
        // Ignore delete errors
      }
    }

    // Create new template in Documenso
    const { templateId } = await documenso.createTemplate(buffer, file.name, title)

    // Update database
    const updateData = templateType === 'purchase'
      ? {
          purchase_agreement_template_id: templateId,
          purchase_agreement_file_name: file.name,
          use_general_template: false,
        }
      : {
          assignment_contract_template_id: templateId,
          assignment_contract_file_name: file.name,
          use_general_template: false,
        }

    const { data: updated, error: updateError } = await supabase
      .from('state_templates')
      .update(updateData)
      .eq('state_code', stateCode)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      templateId,
      stateTemplate: updated,
    })
  } catch (error) {
    console.error('Template upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload template' },
      { status: 500 }
    )
  }
}

// DELETE /api/templates/[stateCode] - Remove a template for a state (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  const authResult = await verifyAdminAccess()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { stateCode } = await params
  const { searchParams } = new URL(request.url)
  const templateType = searchParams.get('type') as 'purchase' | 'assignment'

  if (!templateType || !['purchase', 'assignment'].includes(templateType)) {
    return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
  }

  const supabase = authResult.adminSupabase

  const { data: stateTemplate, error: fetchError } = await supabase
    .from('state_templates')
    .select('*')
    .eq('state_code', stateCode)
    .single()

  if (fetchError || !stateTemplate) {
    return NextResponse.json({ error: 'State not found' }, { status: 404 })
  }

  const templateId = templateType === 'purchase'
    ? stateTemplate.purchase_agreement_template_id
    : stateTemplate.assignment_contract_template_id

  // Delete from Documenso if exists
  if (templateId) {
    try {
      await documenso.deleteTemplate(templateId)
    } catch {
      // Ignore delete errors
    }
  }

  // Update database
  const updateData = templateType === 'purchase'
    ? { purchase_agreement_template_id: null, purchase_agreement_file_name: null }
    : { assignment_contract_template_id: null, assignment_contract_file_name: null }

  // Check if we should reset use_general_template
  const otherTemplateId = templateType === 'purchase'
    ? stateTemplate.assignment_contract_template_id
    : stateTemplate.purchase_agreement_template_id

  // If both templates will be null after this, set use_general_template to true
  if (!otherTemplateId && stateCode !== 'GENERAL') {
    Object.assign(updateData, { use_general_template: true })
  }

  const { error: updateError } = await supabase
    .from('state_templates')
    .update(updateData)
    .eq('state_code', stateCode)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PATCH /api/templates/[stateCode] - Update template settings or HTML content (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  const authResult = await verifyAdminAccess()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { stateCode } = await params
  const body = await request.json()
  const { use_general_template, purchase_agreement_html, reset_to_general } = body

  const supabase = authResult.adminSupabase

  // Handle use_general_template update
  if (typeof use_general_template === 'boolean') {
    const { data: updated, error } = await supabase
      .from('state_templates')
      .update({ use_general_template })
      .eq('state_code', stateCode)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, stateTemplate: updated })
  }

  // Handle resetting to general template
  if (reset_to_general) {
    const { data: updated, error } = await supabase
      .from('state_templates')
      .update({
        purchase_agreement_html: null,
        is_purchase_customized: false
      })
      .eq('state_code', stateCode)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, stateTemplate: updated })
  }

  // Handle HTML content update
  if (typeof purchase_agreement_html === 'string') {
    const { data: updated, error } = await supabase
      .from('state_templates')
      .update({
        purchase_agreement_html,
        is_purchase_customized: true
      })
      .eq('state_code', stateCode)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, stateTemplate: updated })
  }

  return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
}

// GET /api/templates/[stateCode] - Get template content for a state (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
) {
  const authResult = await verifyAdminAccess()
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { stateCode } = await params
  const supabase = authResult.adminSupabase

  // Get state template record
  const { data: stateTemplate, error: fetchError } = await supabase
    .from('state_templates')
    .select('*')
    .eq('state_code', stateCode)
    .single()

  if (fetchError || !stateTemplate) {
    return NextResponse.json({ error: 'State not found' }, { status: 404 })
  }

  // If this state has custom HTML, return it
  if (stateTemplate.purchase_agreement_html && stateTemplate.is_purchase_customized) {
    return NextResponse.json({
      stateTemplate,
      html: stateTemplate.purchase_agreement_html,
      isCustomized: true
    })
  }

  // Otherwise, get the general template HTML
  const { data: generalTemplate } = await supabase
    .from('state_templates')
    .select('purchase_agreement_html')
    .eq('state_code', 'GENERAL')
    .single()

  // If general template has HTML content, return it
  if (generalTemplate?.purchase_agreement_html) {
    return NextResponse.json({
      stateTemplate,
      html: generalTemplate.purchase_agreement_html,
      isCustomized: false
    })
  }

  // No HTML content yet - read from file system as default
  const fs = await import('fs/promises')
  const path = await import('path')

  try {
    const templatePath = path.join(process.cwd(), 'lib/templates/purchase-agreement.html')
    const html = await fs.readFile(templatePath, 'utf-8')

    return NextResponse.json({
      stateTemplate,
      html,
      isCustomized: false
    })
  } catch {
    return NextResponse.json({
      stateTemplate,
      html: '',
      isCustomized: false
    })
  }
}
