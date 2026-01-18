/**
 * Add General Purchase Agreement template to the database
 * Run with: npx ts-node scripts/add-purchase-agreement-template.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PROJECT_REF = 'goegbuyfwoqkzszkfyzy'
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

async function addPurchaseAgreement() {
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

    // Read the HTML file
    const htmlPath = path.join(__dirname, '../lib/templates/purchase-agreement.html')
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8')

    console.log('Adding General Purchase Agreement template...')

    // Check if it already exists
    const { rows: existing } = await client.query(`
      SELECT id FROM company_templates WHERE name = 'General Purchase Agreement' AND is_example = TRUE
    `)

    if (existing.length > 0) {
      console.log('Template already exists, updating...')
      await client.query(`
        UPDATE company_templates
        SET html_content = $1,
            description = $2,
            tags = $3,
            used_placeholders = $4,
            signature_layout = $5,
            updated_at = NOW()
        WHERE name = 'General Purchase Agreement' AND is_example = TRUE
      `, [
        htmlContent,
        'Comprehensive purchase contract with escrow instructions - suitable for most real estate transactions',
        ['purchase', 'escrow', 'comprehensive', 'florida'],
        [
          'property_address', 'property_city', 'property_state', 'property_zip', 'apn',
          'earnest_money', 'purchase_price', 'close_of_escrow',
          'escrow_agent_name', 'escrow_agent_address', 'escrow_officer', 'escrow_agent_email',
          'seller_name', 'seller_address', 'seller_email', 'seller_phone',
          'company_name', 'company_email', 'company_phone', 'company_signer_name',
          'inspection_period', 'personal_property', 'additional_terms',
          'contract_date', 'ai_clauses', 'buyer_signature_img'
        ],
        'two-column'
      ])
      console.log('  - Template updated!')
    } else {
      console.log('Inserting new template...')
      await client.query(`
        INSERT INTO company_templates (
          company_id, name, description, tags, html_content,
          signature_layout, custom_fields, used_placeholders,
          is_example, is_active
        )
        VALUES (
          NULL, $1, $2, $3, $4, $5, '[]', $6, TRUE, TRUE
        )
      `, [
        'General Purchase Agreement',
        'Comprehensive purchase contract with escrow instructions - suitable for most real estate transactions',
        ['purchase', 'escrow', 'comprehensive', 'florida'],
        htmlContent,
        'two-column',
        [
          'property_address', 'property_city', 'property_state', 'property_zip', 'apn',
          'earnest_money', 'purchase_price', 'close_of_escrow',
          'escrow_agent_name', 'escrow_agent_address', 'escrow_officer', 'escrow_agent_email',
          'seller_name', 'seller_address', 'seller_email', 'seller_phone',
          'company_name', 'company_email', 'company_phone', 'company_signer_name',
          'inspection_period', 'personal_property', 'additional_terms',
          'contract_date', 'ai_clauses', 'buyer_signature_img'
        ]
      ])
      console.log('  - Template inserted!')
    }

    console.log('\nDone!')
    client.release()
  } catch (error) {
    console.error('Failed:', error)
  } finally {
    await pool.end()
  }
}

addPurchaseAgreement()
