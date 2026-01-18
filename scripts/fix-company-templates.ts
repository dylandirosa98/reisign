/**
 * Fix company_templates to allow NULL company_id for example templates
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PROJECT_REF = 'goegbuyfwoqkzszkfyzy'
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

async function fix() {
  const { Pool } = await import('pg')

  const pool = new Pool({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    const client = await pool.connect()

    console.log('Fixing company_templates table...')

    // Make company_id nullable
    await client.query(`
      ALTER TABLE company_templates
      ALTER COLUMN company_id DROP NOT NULL
    `)
    console.log('  - Made company_id nullable')

    // Update the foreign key constraint to allow NULL
    await client.query(`
      ALTER TABLE company_templates
      DROP CONSTRAINT IF EXISTS company_templates_company_id_fkey
    `)
    await client.query(`
      ALTER TABLE company_templates
      ADD CONSTRAINT company_templates_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    `)
    console.log('  - Updated foreign key constraint')

    // Insert example templates with NULL company_id
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
    <p>The total purchase price is $&#123;{purchase_price}}</p>
    <p>Earnest Money Deposit: $&#123;{earnest_money}}</p>
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
        used_placeholders: ['contract_date', 'seller_name', 'seller_email', 'seller_phone', 'seller_address', 'company_name', 'company_email', 'company_phone', 'property_address', 'property_city', 'property_state', 'property_zip', 'apn', 'purchase_price', 'earnest_money', 'close_of_escrow', 'inspection_period', 'escrow_agent_name', 'escrow_agent_address', 'ai_clauses', 'additional_terms'],
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
    <p><strong>Assignment Fee:</strong> $&#123;{assignment_fee}}</p>
    <p><strong>Original Purchase Price:</strong> $&#123;{purchase_price}}</p>
  </div>

  <div class="section">
    <div class="section-title">ORIGINAL SELLER</div>
    <p>{{seller_name}}</p>
    <p>Email: {{seller_email}}</p>
  </div>
</body>
</html>`,
        signature_layout: 'three-party',
        used_placeholders: ['contract_date', 'company_name', 'company_email', 'assignee_name', 'assignee_email', 'assignee_phone', 'assignee_address', 'property_address', 'property_city', 'property_state', 'property_zip', 'assignment_fee', 'purchase_price', 'seller_name', 'seller_email'],
      },
    ]

    for (const template of exampleTemplates) {
      console.log(`  - Inserting: ${template.name}`)
      await client.query(`
        INSERT INTO company_templates (company_id, name, description, tags, html_content, signature_layout, custom_fields, used_placeholders, is_example, is_active)
        VALUES (NULL, $1, $2, $3, $4, $5, '[]', $6, TRUE, TRUE)
        ON CONFLICT DO NOTHING
      `, [template.name, template.description, template.tags, template.html_content, template.signature_layout, template.used_placeholders])
    }

    console.log('\nFix completed successfully!')
    client.release()
  } catch (error) {
    console.error('Fix failed:', error)
  } finally {
    await pool.end()
  }
}

fix()
