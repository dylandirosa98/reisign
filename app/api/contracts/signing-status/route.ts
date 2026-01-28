import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/contracts/signing-status - Get contract signing status (public endpoint for signers)
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const contractId = url.searchParams.get('contractId')
  const token = url.searchParams.get('token')

  if (!contractId && !token) {
    return NextResponse.json({ error: 'Missing contractId or token' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  try {
    let contract

    if (contractId) {
      // Look up by contract ID
      const { data, error } = await adminSupabase
        .from('contracts')
        .select(`
          id,
          status,
          seller_name,
          buyer_name,
          custom_fields,
          property:properties(address, city, state, zip)
        `)
        .eq('id', contractId)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
      }

      contract = data
    } else {
      // Could extend to lookup by Documenso token if needed
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    const customFields = contract.custom_fields as {
      property_address?: string
    } | null

    const propertyAddress = customFields?.property_address ||
      (contract.property
        ? `${contract.property.address}, ${contract.property.city}, ${contract.property.state}`
        : '')

    return NextResponse.json({
      status: contract.status,
      propertyAddress,
      sellerName: contract.seller_name,
      buyerName: contract.buyer_name,
    })
  } catch (error) {
    console.error('Error checking signing status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
