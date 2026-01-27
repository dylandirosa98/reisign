import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST /api/contracts/[id]/notify-manager - Notify managers that a contract needs signature
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

  // Get user's company and info
  const { data: userData } = await adminSupabase
    .from('users')
    .select('company_id, full_name, email')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  // Get the contract
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

  // Only allow notification for draft contracts that need signature
  if (contract.status !== 'draft') {
    return NextResponse.json({
      error: 'Contract has already been signed or sent'
    }, { status: 400 })
  }

  // Get all managers in the company
  const { data: managers } = await adminSupabase
    .from('users')
    .select('id, email, full_name')
    .eq('company_id', userData.company_id)
    .in('role', ['manager', 'admin'])

  if (!managers || managers.length === 0) {
    return NextResponse.json({
      error: 'No managers found in your company'
    }, { status: 400 })
  }

  // Build property address
  const customFields = contract.custom_fields as Record<string, unknown> | null
  const propertyAddress = (customFields?.property_address as string) ||
    contract.property?.address || 'Unknown Property'
  const propertyCity = (customFields?.property_city as string) ||
    contract.property?.city || ''
  const propertyState = (customFields?.property_state as string) ||
    contract.property?.state || ''

  const fullAddress = `${propertyAddress}${propertyCity ? `, ${propertyCity}` : ''}${propertyState ? `, ${propertyState}` : ''}`

  // Send email to all managers
  const managerEmails = managers.map(m => m.email).filter(Boolean) as string[]

  if (managerEmails.length === 0) {
    return NextResponse.json({
      error: 'No manager email addresses found'
    }, { status: 400 })
  }

  const requesterName = userData.full_name || userData.email || 'A team member'
  const contractUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/contracts/${id}`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'REI Sign <noreply@reisign.com>',
      to: managerEmails,
      subject: `Contract Ready for Signature: ${fullAddress}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a365d;">Contract Ready for Your Signature</h2>

          <p><strong>${requesterName}</strong> has prepared a contract that requires your signature before it can be sent to the seller.</p>

          <div style="background: #f7fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Property:</strong> ${fullAddress}</p>
            <p style="margin: 0 0 8px 0;"><strong>Seller:</strong> ${contract.seller_name || 'Not specified'}</p>
            <p style="margin: 0;"><strong>Price:</strong> $${contract.price?.toLocaleString() || '0'}</p>
          </div>

          <p>Please review and sign this contract so it can be sent to the seller for their signature.</p>

          <a href="${contractUrl}" style="display: inline-block; background: #1a365d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
            Review & Sign Contract
          </a>

          <p style="color: #718096; font-size: 14px; margin-top: 24px;">
            This notification was sent from REI Sign because a team member requested manager approval.
          </p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${managerEmails.length} manager(s)`
    })
  } catch (emailError) {
    console.error('Failed to send manager notification:', emailError)
    return NextResponse.json({
      error: 'Failed to send notification email'
    }, { status: 500 })
  }
}
