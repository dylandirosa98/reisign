import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { CompanyTemplate } from '@/types/database'

// POST - Copy a template (useful for copying examples)
export async function POST(
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

    // Get the source template
    const { data, error: fetchError } = await adminSupabase
      .from('company_templates' as any)
      .select('*')
      .eq('id', id)
      .or(`company_id.eq.${userData.company_id},is_example.eq.true`)
      .single()

    const sourceTemplate = data as CompanyTemplate | null

    if (fetchError || !sourceTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Get optional new name from request body
    const body = await request.json().catch(() => ({}))
    const newName = body.name || `${sourceTemplate.name} (Copy)`

    // Create the copy
    const { data: newTemplate, error: insertError } = await adminSupabase
      .from('company_templates' as any)
      .insert({
        company_id: userData.company_id,
        created_by: user.id,
        name: newName,
        description: sourceTemplate.description,
        tags: sourceTemplate.tags,
        html_content: sourceTemplate.html_content,
        signature_layout: sourceTemplate.signature_layout,
        custom_fields: sourceTemplate.custom_fields,
        used_placeholders: sourceTemplate.used_placeholders,
        is_example: false,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error copying template:', insertError)
      return NextResponse.json({ error: 'Failed to copy template' }, { status: 500 })
    }

    return NextResponse.json({ template: newTemplate })
  } catch (error) {
    console.error('Error in POST /api/company-templates/[id]/copy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
