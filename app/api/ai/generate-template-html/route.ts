import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Placeholder {
  key: string
  label: string
  category: string
}

export async function POST(request: NextRequest) {
  try {
    const { plainText, placeholders } = await request.json() as {
      plainText: string
      placeholders: Placeholder[]
    }

    if (!plainText?.trim()) {
      return NextResponse.json(
        { error: 'Contract text is required' },
        { status: 400 }
      )
    }

    // Build placeholder reference for the prompt
    const placeholderList = placeholders
      .map(p => `- {{${p.key}}} = ${p.label} (${p.category})`)
      .join('\n')

    // CSS styles from the General Purchase Agreement template
    const templateCss = `@page {
      size: letter;
      margin: 0.75in 1in 1in 1in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }

    h1 {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 12pt;
    }

    .intro {
      text-indent: 0.5in;
      text-align: justify;
      margin-bottom: 10pt;
    }

    .section-header {
      margin-top: 10pt;
      margin-bottom: 6pt;
    }

    .section-number {
      font-weight: bold;
    }

    .subsection {
      margin-left: 0.5in;
      margin-bottom: 6pt;
    }

    .field-line {
      display: inline-block;
      border-bottom: 1px solid #000;
      min-width: 200px;
      padding: 0 2px;
    }

    .field-line.short {
      min-width: 100px;
    }

    .field-line.medium {
      min-width: 150px;
    }

    .indented {
      margin-left: 1in;
      margin-bottom: 4pt;
    }

    .indented-more {
      margin-left: 1.5in;
      margin-bottom: 4pt;
    }

    .checkbox {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 1px solid #000;
      margin-right: 2px;
      vertical-align: middle;
    }

    .checkbox.checked {
      background-color: #000;
      position: relative;
    }

    .checkbox.checked::after {
      content: '✓';
      color: #fff;
      font-size: 8px;
      position: absolute;
      top: -1px;
      left: 1px;
    }

    .paragraph {
      text-align: justify;
      margin-bottom: 10pt;
      text-indent: 0.5in;
    }

    .paragraph-no-indent {
      text-align: justify;
      margin-bottom: 10pt;
    }

    .section-title {
      font-weight: bold;
    }

    .center-text {
      text-align: center;
    }`

    const prompt = `You are a contract HTML formatter. Convert the following plain text contract into properly formatted HTML that matches our standard legal document format.

IMPORTANT RULES:
1. Use the EXACT text provided - do not add, remove, or change any wording
2. Format it as a professional legal document matching our standard format
3. Replace appropriate values with placeholders from the list below
4. Use the EXACT CSS classes defined below - do not create your own styles
5. Number sections properly (1., 1.1, 1.2, 2., 2.1, etc.)
6. DO NOT include any signature page - that will be added automatically
7. DO NOT include "[SIGNATURES ON FOLLOWING PAGE]" - that will be added automatically
8. Return ONLY the HTML code, no explanation
9. ALWAYS add a $ symbol before price/money placeholders (e.g., $\{\{purchase_price\}\}, $\{\{earnest_money\}\}, $\{\{assignment_fee\}\}) - the form only accepts numbers so the $ must be in the template

CRITICAL PLACEHOLDER RULES:
10. Every <span class="field-line"> MUST contain a {{placeholder}} — NEVER leave one empty.
11. For fields matching the standard list below, use the standard name (e.g., {{seller_name}}, {{purchase_price}}).
12. For ALL OTHER blank/fill-in lines, create a descriptive snake_case placeholder from the surrounding context (e.g., {{repair_deadline_days}}, {{mortgage_type_from}}, {{title_company_name}}, {{closing_date_extension}}).
13. Prefix monetary placeholders with $ in the template (e.g., $\{\{repair_cost_limit\}\}).
14. For yes/no options, multiple-choice selections, or anywhere a checkmark/checkbox makes sense, put the placeholder in the CLASS attribute: <span class="checkbox {{field_name_check}}"></span> — the _check suffix indicates a checkbox placeholder. The value will be "checked" or "" which toggles the CSS class.
15. When the plain text has a label followed by a colon and then a blank line, underscores, dashes, or whitespace (e.g., "Buyer Name: ___________", "Phone: ", "Address:                "), that colon signals a fill-in field — ALWAYS place a <span class="field-line">{{placeholder}}</span> after the colon. Derive the placeholder name from the label (e.g., "Buyer Name:" → {{buyer_name}}, "License #:" → {{license_number}}, "Title Company:" → {{title_company_name}}).

EXAMPLES:

CORRECT text field:
  Seller agrees to complete repairs within <span class="field-line">{{repair_deadline_days}}</span> days.

CORRECT colon field (label followed by colon and blank):
  Buyer Name: <span class="field-line">{{buyer_name}}</span>
  Phone: <span class="field-line">{{seller_phone}}</span>
  Title Company: <span class="field-line">{{title_company_name}}</span>
  License #: <span class="field-line">{{license_number}}</span>

INCORRECT (empty field-line — NEVER do this):
  Seller agrees to complete repairs within <span class="field-line"></span> days.

INCORRECT (colon with no field — NEVER do this):
  Buyer Name: ___________
  Phone:

CORRECT checkbox (placeholder in class attribute):
  <span class="checkbox {{conventional_mortgage_check}}"></span> Conventional
  <span class="checkbox {{fha_mortgage_check}}"></span> FHA
  <span class="checkbox {{va_mortgage_check}}"></span> VA

INCORRECT checkbox (no placeholder — NEVER do this):
  <span class="checkbox"></span> Conventional

REQUIRED CSS (use this exact CSS in the <style> tag):
${templateCss}

HTML STRUCTURE TO USE:
- <h1> for the contract title
- <p class="intro"> for introductory paragraphs with indent
- <p class="section-header"><span class="section-number">1.</span> <span class="section-title">SECTION NAME</span></p> for main section headers
- <div class="subsection"> for subsection content (indented)
- <p class="paragraph"> for body paragraphs (justified, indented)
- <p class="paragraph-no-indent"> for paragraphs without indent
- <span class="field-line">{{placeholder}}</span> for fill-in fields with underline
- <span class="checkbox {{field_name_check}}"></span> for checkbox fields (placeholder in class attribute)
- <p class="indented"> for indented items
- <p class="center-text"> for centered text

AVAILABLE PLACEHOLDERS (use these where appropriate):
${placeholderList}

PLAIN TEXT CONTRACT:
${plainText}

OUTPUT FORMAT:
Return a complete HTML document:
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    [THE EXACT CSS PROVIDED ABOVE]
  </style>
</head>
<body>
  [FORMATTED CONTRACT CONTENT USING THE CLASSES ABOVE]
</body>
</html>`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document HTML formatter specializing in real estate contracts. You convert plain text contracts into properly formatted HTML using a specific CSS framework. You MUST use the exact CSS classes provided (like .paragraph, .section-header, .subsection, .field-line) - never create your own styles. You preserve the exact text while adding proper structure. You use placeholders like {{seller_name}} for dynamic values. CRITICAL: Every blank fill-in line MUST get a {{placeholder}} — never leave a field-line empty. When you see a label followed by a colon and a blank/underscores (e.g., "Buyer Name: ___", "Phone: "), that is ALWAYS a fill-in field — place a <span class="field-line">{{placeholder}}</span> after the colon. The output should look like a professional legal document with Times New Roman font, proper section numbering, and justified text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    })

    let html = completion.choices[0]?.message?.content || ''

    // Clean up the response - remove markdown code blocks if present
    html = html.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim()

    // Ensure it starts with DOCTYPE
    if (!html.toLowerCase().startsWith('<!doctype')) {
      html = '<!DOCTYPE html>\n<html>\n<head>\n<style>\nbody { font-family: "Times New Roman", serif; font-size: 11pt; line-height: 1.4; }\n</style>\n</head>\n<body>\n' + html + '\n</body>\n</html>'
    }

    // Post-processing: warn about any empty field-line spans and fix them
    const emptyFieldLineRegex = /<span class="field-line">\s*<\/span>/g
    const emptyFieldLines = html.match(emptyFieldLineRegex)
    if (emptyFieldLines) {
      console.warn(`[AI HTML] WARNING: ${emptyFieldLines.length} empty field-line spans found. These should contain {{placeholder}} tags.`)
    }

    // Post-processing: warn about any empty checkbox spans
    const emptyCheckboxRegex = /<span class="checkbox">\s*<\/span>/g
    const emptyCheckboxes = html.match(emptyCheckboxRegex)
    if (emptyCheckboxes) {
      console.warn(`[AI HTML] WARNING: ${emptyCheckboxes.length} empty checkbox spans found. These should contain {{field_check}} tags.`)
    }

    // Extract all discovered placeholders from the HTML
    const placeholderRegex = /\{\{([^}#/]+)\}\}/g
    const discoveredPlaceholders: string[] = []
    let match
    while ((match = placeholderRegex.exec(html)) !== null) {
      const key = match[1].trim()
      if (!discoveredPlaceholders.includes(key)) {
        discoveredPlaceholders.push(key)
      }
    }

    return NextResponse.json({ html, discoveredPlaceholders })
  } catch (error) {
    console.error('AI HTML generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate HTML. Please try again.' },
      { status: 500 }
    )
  }
}
