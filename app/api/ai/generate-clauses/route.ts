import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Rate limit: 50 AI generations per user per day
const DAILY_RATE_LIMIT = 50

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminSupabase = createAdminClient()

    // Get user's company and plan
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.company_id) {
      return NextResponse.json(
        { error: 'No company found' },
        { status: 403 }
      )
    }

    // Check company's plan - must be paid (not free)
    const { data: company, error: companyError } = await adminSupabase
      .from('companies')
      .select('actual_plan')
      .eq('id', userData.company_id)
      .single()

    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 403 }
      )
    }

    // AI generation requires a paid plan (team or business have AI features)
    const paidPlansWithAI = ['team', 'business', 'admin']
    if (!paidPlansWithAI.includes(company.actual_plan)) {
      return NextResponse.json(
        { error: 'AI clause generation requires a Small Team plan or higher. Please upgrade to access this feature.' },
        { status: 403 }
      )
    }

    // Rate limiting - count AI generations in last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { count: recentUsage, error: usageError } = await adminSupabase
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'ai_generation')
      .gte('created_at', twentyFourHoursAgo)

    if (usageError) {
      console.error('Error checking rate limit:', usageError)
      // Continue anyway - don't block on rate limit check failure
    }

    const currentUsage = recentUsage || 0
    if (currentUsage >= DAILY_RATE_LIMIT) {
      return NextResponse.json(
        { error: `Rate limit exceeded. You can generate up to ${DAILY_RATE_LIMIT} AI clauses per day. Please try again tomorrow.` },
        { status: 429 }
      )
    }

    // Validate request body
    const body = await request.json()
    const { situation, contractDetails } = body

    if (!situation || situation.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide more detail about your situation (at least 10 characters)' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Build context about the contract
    const contractContext = contractDetails ? `
Contract Details:
- Property: ${contractDetails.property_address || 'Not specified'}, ${contractDetails.property_city || ''}, ${contractDetails.property_state || ''} ${contractDetails.property_zip || ''}
- Purchase Price: ${contractDetails.price ? `$${Number(contractDetails.price).toLocaleString()}` : 'Not specified'}
- Seller: ${contractDetails.seller_name || 'Not specified'}
- Close of Escrow: ${contractDetails.close_of_escrow || 'Not specified'}
- Inspection Period: ${contractDetails.inspection_period ? `${contractDetails.inspection_period} days` : 'Not specified'}
` : ''

    const systemPrompt = `You are a real estate contract specialist helping wholesalers create appropriate additional clauses for their purchase agreements.

Your role is to generate protective, legally-sound clauses based on the unique situation described by the user.

Guidelines:
1. ALWAYS generate at least 1 clause for any situation described - the user is asking for help because they have a unique situation
2. Generate 1-5 clauses depending on the complexity of the situation
3. Each clause should be clear, specific, and enforceable
4. Use standard real estate contract language
5. Focus on protecting both parties while addressing the specific situation
6. Keep clauses concise but comprehensive
7. Common scenarios include: repair credits, as-is sales, assignment rights, inspection contingencies, title issues, occupancy concerns, tenant situations, damage disclosures, etc.

For example, if someone mentions "roof damage with a $5,000 credit", you should generate a clause that clearly states the repair credit amount, when it will be applied (at closing), and what it covers.

IMPORTANT: You are NOT providing legal advice. These are suggestions that should be reviewed by a licensed attorney before use.

Return your response as a JSON array of clause objects with this exact structure:
{
  "clauses": [
    {
      "title": "Short descriptive title",
      "content": "The full clause text that would appear in the contract"
    }
  ]
}

Only return the JSON, no additional text. NEVER return an empty clauses array.`

    const userPrompt = `${contractContext}

User's Situation:
${situation}

Based on this situation, generate appropriate additional clauses for this real estate purchase agreement.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    const responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Parse the JSON response
    try {
      // Remove markdown code blocks if present
      let jsonStr = responseContent.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      jsonStr = jsonStr.trim()

      const parsed = JSON.parse(jsonStr)

      if (!parsed.clauses || !Array.isArray(parsed.clauses)) {
        throw new Error('Invalid response format')
      }

      // Validate and clean up clauses, filtering out empty ones
      const clauses = parsed.clauses
        .filter((clause: { title?: string; content?: string }) => clause.content && clause.content.trim())
        .map((clause: { title?: string; content?: string }, index: number) => ({
          id: `clause-${Date.now()}-${index}`,
          title: clause.title || `Clause ${index + 1}`,
          content: clause.content || '',
          status: 'pending' as const,
        }))

      // If AI returned empty clauses despite having a valid situation, return an error
      if (clauses.length === 0) {
        console.warn('AI returned empty clauses for situation:', situation)
        return NextResponse.json(
          { error: 'AI could not generate clauses for this situation. Please provide more details about what needs to be documented in the contract.' },
          { status: 400 }
        )
      }

      // Log successful AI usage for rate limiting
      await adminSupabase
        .from('usage_logs')
        .insert({
          company_id: userData.company_id,
          user_id: user.id,
          action_type: 'ai_generation',
          metadata: {
            clauses_generated: clauses.length,
            situation_length: situation.length,
          },
        })

      return NextResponse.json({
        clauses,
        usage: {
          used: currentUsage + 1,
          limit: DAILY_RATE_LIMIT,
          remaining: DAILY_RATE_LIMIT - currentUsage - 1,
        },
      })
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseContent)
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('AI clause generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate clauses' },
      { status: 500 }
    )
  }
}
