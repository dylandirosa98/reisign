/**
 * Deactivate unwanted example templates
 * Only keep "General Purchase Agreement" as the default example template
 *
 * Run with: npx ts-node scripts/deactivate-example-templates.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PROJECT_REF = 'goegbuyfwoqkzszkfyzy'
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

async function deactivateTemplates() {
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

    // Templates to deactivate
    const templatesToDeactivate = [
      'Simple Purchase Agreement',
      'Assignment Contract',
    ]

    console.log('Deactivating unwanted example templates...')

    for (const templateName of templatesToDeactivate) {
      const { rowCount } = await client.query(`
        UPDATE company_templates
        SET is_active = FALSE, updated_at = NOW()
        WHERE name = $1 AND is_example = TRUE
      `, [templateName])

      if (rowCount && rowCount > 0) {
        console.log(`  - Deactivated: ${templateName}`)
      } else {
        console.log(`  - Not found or already deactivated: ${templateName}`)
      }
    }

    // Verify what's left active
    const { rows: activeTemplates } = await client.query(`
      SELECT name FROM company_templates
      WHERE is_example = TRUE AND is_active = TRUE
    `)

    console.log('\nActive example templates:')
    activeTemplates.forEach((t: { name: string }) => console.log(`  - ${t.name}`))

    console.log('\nDone!')
    client.release()
  } catch (error) {
    console.error('Failed:', error)
  } finally {
    await pool.end()
  }
}

deactivateTemplates()
