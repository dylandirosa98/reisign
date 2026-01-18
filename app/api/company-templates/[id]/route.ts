import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { CustomField, CompanyTemplate } from '@/types/database'

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

// GET - Get a single template by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Get template (must be from user's company or be an example)
    const { data: template, error } = await adminSupabase
      .from('company_templates' as any)
      .select('*')
      .eq('id', id)
      .or(`company_id.eq.${userData.company_id},is_example.eq.true`)
      .single()

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in GET /api/company-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Check template belongs to company (can't edit examples directly)
    const { data: existingData } = await adminSupabase
      .from('company_templates' as any)
      .select('id, company_id, is_example')
      .eq('id', id)
      .single()

    const existingTemplate = existingData as { id: string; company_id: string | null; is_example: boolean } | null

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplate.is_example) {
      return NextResponse.json(
        { error: 'Cannot edit example templates. Copy it first.' },
        { status: 403 }
      )
    }

    if (existingTemplate.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      tags,
      html_content,
      signature_layout,
      custom_fields,
    } = body as {
      name?: string
      description?: string
      tags?: string[]
      html_content?: string
      signature_layout?: string
      custom_fields?: CustomField[]
    }

    // Build update object
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (tags !== undefined) updates.tags = tags
    if (html_content !== undefined) {
      updates.html_content = html_content
      updates.used_placeholders = extractPlaceholders(html_content)
    }
    if (signature_layout !== undefined) updates.signature_layout = signature_layout
    if (custom_fields !== undefined) updates.custom_fields = custom_fields

    const { data: template, error } = await adminSupabase
      .from('company_templates' as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error in PUT /api/company-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a template (soft delete by setting is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Check template belongs to company (can't delete examples)
    const { data: existingDataDel } = await adminSupabase
      .from('company_templates' as any)
      .select('id, company_id, is_example')
      .eq('id', id)
      .single()

    const existingTemplateDel = existingDataDel as { id: string; company_id: string | null; is_example: boolean } | null

    if (!existingTemplateDel) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existingTemplateDel.is_example) {
      return NextResponse.json(
        { error: 'Cannot delete example templates' },
        { status: 403 }
      )
    }

    if (existingTemplateDel.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete
    const { error } = await adminSupabase
      .from('company_templates' as any)
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/company-templates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
