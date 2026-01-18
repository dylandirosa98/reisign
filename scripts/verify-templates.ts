/**
 * Verify company_templates setup
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PROJECT_REF = 'goegbuyfwoqkzszkfyzy'
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

async function verify() {
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

    // Check templates
    const { rows } = await client.query(`
      SELECT id, name, is_example, company_id, signature_layout, array_length(used_placeholders, 1) as placeholder_count
      FROM company_templates
    `)

    console.log('\nTemplates in database:')
    for (const row of rows) {
      console.log(`  - ${row.name} (example: ${row.is_example}, layout: ${row.signature_layout}, placeholders: ${row.placeholder_count})`)
    }

    // Fix the HTML content to have proper ${{}} syntax
    console.log('\nFixing HTML content for dollar signs...')
    const dollarBrace = '$' + '{{'
    const htmlEntity = '$&#123;{'
    await client.query(
      `UPDATE company_templates SET html_content = REPLACE(html_content, $1, $2) WHERE html_content LIKE $3`,
      [htmlEntity, dollarBrace, '%' + htmlEntity + '%']
    )
    console.log('  Done!')

    // Update RLS policy to properly handle NULL company_id for examples
    console.log('\nUpdating RLS policies...')

    // Drop and recreate SELECT policy
    await client.query(`DROP POLICY IF EXISTS "Users can view company templates" ON company_templates`)
    await client.query(`
      CREATE POLICY "Users can view company templates"
      ON company_templates FOR SELECT
      USING (
        is_example = TRUE
        OR company_id IN (
          SELECT company_id FROM users WHERE id = auth.uid()
        )
      )
    `)
    console.log('  - Updated SELECT policy')

    console.log('\nVerification complete!')
    client.release()
  } catch (error) {
    console.error('Verification failed:', error)
  } finally {
    await pool.end()
  }
}

verify()
