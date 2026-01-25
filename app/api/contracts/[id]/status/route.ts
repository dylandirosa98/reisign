import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { documenso } from '@/lib/documenso'

// GET /api/contracts/[id]/status - Get document signing status from Documenso
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

  // Get contract
  const { data: contract, error: contractError } = await adminSupabase
    .from('contracts')
    .select('id, documenso_document_id, seller_name, seller_email, buyer_name, buyer_email')
    .eq('id', id)
    .eq('company_id', userData.company_id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  if (!contract.documenso_document_id) {
    return NextResponse.json({ error: 'Contract has not been sent yet' }, { status: 400 })
  }

  try {
    // Get document status from Documenso
    const docStatus = await documenso.getDocumentStatus(contract.documenso_document_id)

    // Map recipients to their roles based on email matching
    const recipientStatuses = docStatus.recipients.map(r => {
      let role = 'unknown'
      if (r.email.toLowerCase() === contract.seller_email?.toLowerCase()) {
        role = 'seller'
      } else if (r.email.toLowerCase() === contract.buyer_email?.toLowerCase()) {
        role = 'assignee'
      }

      return {
        id: r.id,
        email: r.email,
        name: r.name,
        role,
        signingStatus: r.signingStatus,
        signedAt: r.signedAt,
        token: r.token,
      }
    })

    return NextResponse.json({
      documentId: docStatus.id,
      documentStatus: docStatus.status,
      recipients: recipientStatuses,
    })
  } catch (error) {
    console.error('Failed to get document status:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get document status' },
      { status: 500 }
    )
  }
}
