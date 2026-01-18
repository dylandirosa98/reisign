/**
 * Setup script for company_templates table
 * Run with: npx ts-node scripts/setup-company-templates.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

// Example templates
const exampleTemplates = [
  {
    name: 'Simple Purchase Agreement',
    description: 'A basic purchase agreement template for quick deals',
    tags: ['purchase', 'simple', 'starter'],
    html_content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; padding: 0.5in; }
    h1 { text-align: center; font-size: 16pt; margin-bottom: 20pt; }
    .section { margin-bottom: 15pt; }
    .section-title { font-weight: bold; margin-bottom: 5pt; }
    .field { border-bottom: 1px solid #000; min-width: 200px; display: inline-block; }
  </style>
</head>
<body>
  <h1>REAL ESTATE PURCHASE AGREEMENT</h1>

  <div class="section">
    <p>This Purchase Agreement ("Agreement") is entered into as of <span class="field">{{contract_date}}</span></p>
  </div>

  <div class="section">
    <div class="section-title">1. PARTIES</div>
    <p><strong>SELLER:</strong> {{seller_name}}</p>
    <p>Email: {{seller_email}} | Phone: {{seller_phone}}</p>
    <p>Address: {{seller_address}}</p>
    <br/>
    <p><strong>BUYER:</strong> {{company_name}}</p>
    <p>Email: {{company_email}} | Phone: {{company_phone}}</p>
  </div>

  <div class="section">
    <div class="section-title">2. PROPERTY</div>
    <p>{{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
    <p>APN: {{apn}}</p>
  </div>

  <div class="section">
    <div class="section-title">3. PURCHASE PRICE</div>
    <p>The total purchase price is \${{purchase_price}}</p>
    <p>Earnest Money Deposit: \${{earnest_money}}</p>
  </div>

  <div class="section">
    <div class="section-title">4. CLOSING</div>
    <p>Close of Escrow: {{close_of_escrow}}</p>
    <p>Inspection Period: {{inspection_period}} days</p>
  </div>

  <div class="section">
    <div class="section-title">5. ESCROW</div>
    <p>Escrow Agent: {{escrow_agent_name}}</p>
    <p>Address: {{escrow_agent_address}}</p>
  </div>

  {{#if ai_clauses}}
  <div class="section">
    <div class="section-title">6. ADDITIONAL TERMS</div>
    {{ai_clauses}}
  </div>
  {{/if}}

  <div class="section">
    <div class="section-title">7. ADDITIONAL TERMS</div>
    <p>{{additional_terms}}</p>
  </div>
</body>
</html>`,
    signature_layout: 'two-column',
    custom_fields: [],
    used_placeholders: ['contract_date', 'seller_name', 'seller_email', 'seller_phone', 'seller_address', 'company_name', 'company_email', 'company_phone', 'property_address', 'property_city', 'property_state', 'property_zip', 'apn', 'purchase_price', 'earnest_money', 'close_of_escrow', 'inspection_period', 'escrow_agent_name', 'escrow_agent_address', 'ai_clauses', 'additional_terms'],
    is_example: true,
    is_active: true,
  },
  {
    name: 'Assignment Contract',
    description: 'For assigning purchase agreements to end buyers',
    tags: ['assignment', 'wholesale', 'starter'],
    html_content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; padding: 0.5in; }
    h1 { text-align: center; font-size: 16pt; margin-bottom: 20pt; }
    .section { margin-bottom: 15pt; }
    .section-title { font-weight: bold; margin-bottom: 5pt; }
  </style>
</head>
<body>
  <h1>ASSIGNMENT OF REAL ESTATE PURCHASE AGREEMENT</h1>

  <div class="section">
    <p>This Assignment Agreement is made on <strong>{{contract_date}}</strong></p>
  </div>

  <div class="section">
    <div class="section-title">PARTIES</div>
    <p><strong>ASSIGNOR:</strong> {{company_name}} ("Assignor")</p>
    <p>Email: {{company_email}}</p>
    <br/>
    <p><strong>ASSIGNEE:</strong> {{assignee_name}} ("Assignee")</p>
    <p>Email: {{assignee_email}} | Phone: {{assignee_phone}}</p>
    <p>Address: {{assignee_address}}</p>
  </div>

  <div class="section">
    <div class="section-title">PROPERTY</div>
    <p>{{property_address}}, {{property_city}}, {{property_state}} {{property_zip}}</p>
  </div>

  <div class="section">
    <div class="section-title">ASSIGNMENT</div>
    <p>Assignor hereby assigns all rights, title, and interest in the Purchase Agreement dated {{contract_date}} for the above property to Assignee.</p>
    <p><strong>Assignment Fee:</strong> \${{assignment_fee}}</p>
    <p><strong>Original Purchase Price:</strong> \${{purchase_price}}</p>
  </div>

  <div class="section">
    <div class="section-title">ORIGINAL SELLER</div>
    <p>{{seller_name}}</p>
    <p>Email: {{seller_email}}</p>
  </div>
</body>
</html>`,
    signature_layout: 'three-party',
    custom_fields: [],
    used_placeholders: ['contract_date', 'company_name', 'company_email', 'assignee_name', 'assignee_email', 'assignee_phone', 'assignee_address', 'property_address', 'property_city', 'property_state', 'property_zip', 'assignment_fee', 'purchase_price', 'seller_name', 'seller_email'],
    is_example: true,
    is_active: true,
  },
]

async function setup() {
  console.log('Setting up company_templates...')

  // First, check if the table exists by trying to query it
  const { data: existingData, error: checkError } = await supabase
    .from('company_templates')
    .select('id')
    .limit(1)

  if (checkError && checkError.code === '42P01') {
    console.log('Table does not exist. Please run the SQL migration manually in the Supabase dashboard.')
    console.log('\nGo to: https://supabase.com/dashboard/project/goegbuyfwoqkzszkfyzy/sql')
    console.log('Then paste and run the contents of: supabase/migrations/20250117000000_company_templates.sql')
    return
  }

  if (checkError) {
    console.error('Error checking table:', checkError)
    return
  }

  console.log('Table exists! Checking for example templates...')

  // Check if example templates already exist
  const { data: examples, error: examplesError } = await supabase
    .from('company_templates')
    .select('id, name')
    .eq('is_example', true)

  if (examplesError) {
    console.error('Error checking examples:', examplesError)
    return
  }

  if (examples && examples.length > 0) {
    console.log(`Found ${examples.length} existing example templates:`)
    examples.forEach(e => console.log(`  - ${e.name}`))
    console.log('\nSkipping example template insertion.')
    return
  }

  // Insert example templates with a placeholder company_id (00000000-0000-0000-0000-000000000000)
  console.log('Inserting example templates...')

  for (const template of exampleTemplates) {
    const { error: insertError } = await supabase
      .from('company_templates')
      .insert({
        company_id: '00000000-0000-0000-0000-000000000000',
        ...template,
      })

    if (insertError) {
      console.error(`Error inserting ${template.name}:`, insertError)
    } else {
      console.log(`  Inserted: ${template.name}`)
    }
  }

  console.log('\nSetup complete!')
}

setup().catch(console.error)
