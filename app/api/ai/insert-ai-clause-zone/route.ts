import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { html, sectionNumber } = await request.json() as {
      html: string
      sectionNumber: string // e.g., "5.1" - the section number where AI clauses should be added
    }

    if (!html?.trim()) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      )
    }

    if (!sectionNumber?.trim()) {
      return NextResponse.json(
        { error: 'Section number is required' },
        { status: 400 }
      )
    }

    // If AI clause zone already exists, return error
    if (html.includes('{{ai_clauses}}') || html.includes('class="ai-clause-zone"')) {
      return NextResponse.json(
        { error: 'This template already has an AI clause zone. Remove the existing one first to add a new one.' },
        { status: 400 }
      )
    }

    const prompt = `You are an HTML document editor. Your task is to insert an AI clause zone into the following HTML contract document.

SECTION NUMBER: ${sectionNumber}

TASK:
Insert the AI clause zone as section ${sectionNumber} in the document. Find the correct location based on the section numbering in the document:
- If section number is "5.1", insert it after section 5 (or after 5.0 if it exists) and before section 6
- If section number is "8", insert it after section 7 and before section 9
- If section number is "12.3", insert it after section 12.2 and before 12.4 or 13

AI CLAUSE ZONE HTML TO INSERT:
<!-- AI_CLAUSES_START section="${sectionNumber}" -->
<div class="ai-clause-zone" data-section="${sectionNumber}">
  {{ai_clauses}}
</div>
<!-- AI_CLAUSES_END -->

RULES:
1. Analyze the document structure to find the correct insertion point
2. Determine the correct section number based on existing section numbering
3. Do NOT modify any other content in the document
4. Return the COMPLETE modified HTML document
5. Make sure the AI clause zone fits naturally in the document flow

CURRENT HTML DOCUMENT:
${html}

Return ONLY the modified HTML document with the AI clause zone inserted. No explanations.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an HTML document editor. You insert content into HTML documents at specified locations while maintaining document structure and integrity. You return complete, valid HTML documents.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 10000,
    })

    let modifiedHtml = completion.choices[0]?.message?.content || ''

    // Clean up the response - remove markdown code blocks if present
    modifiedHtml = modifiedHtml.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim()

    // Verify the AI clause zone was actually inserted
    if (!modifiedHtml.includes('{{ai_clauses}}') && !modifiedHtml.includes('ai-clause-zone')) {
      return NextResponse.json(
        { error: 'Failed to insert AI clause zone. Please try again.' },
        { status: 500 }
      )
    }

    // Extract the section number that was used
    const sectionMatch = modifiedHtml.match(/data-section="([^"]+)"/)
    const usedSectionNumber = sectionMatch ? sectionMatch[1] : 'auto'

    return NextResponse.json({
      html: modifiedHtml,
      sectionNumber: usedSectionNumber,
    })
  } catch (error) {
    console.error('AI clause zone insertion error:', error)
    return NextResponse.json(
      { error: 'Failed to insert AI clause zone. Please try again.' },
      { status: 500 }
    )
  }
}
