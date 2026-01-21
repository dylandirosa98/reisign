/**
 * Add overage settings column to companies table
 * Run with: npx tsx scripts/add-overage-settings.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PROJECT_REF = 'goegbuyfwoqkzszkfyzy'
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

async function addOverageSettings() {
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

    console.log('Adding overage_behavior column to companies...')

    // Add the column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'companies' AND column_name = 'overage_behavior'
        ) THEN
          ALTER TABLE companies
          ADD COLUMN overage_behavior TEXT DEFAULT 'warn_each'
          CHECK (overage_behavior IN ('auto_charge', 'warn_each'));
        END IF;
      END $$;
    `)

    console.log('  - Added overage_behavior column (default: warn_each)')

    // Verify
    const { rows } = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'companies' AND column_name = 'overage_behavior'
    `)

    if (rows.length > 0) {
      console.log('\nColumn verified:')
      console.log(`  - ${rows[0].column_name}: ${rows[0].data_type} (default: ${rows[0].column_default})`)
    }

    console.log('\nDone!')
    client.release()
  } catch (error) {
    console.error('Failed:', error)
  } finally {
    await pool.end()
  }
}

addOverageSettings()
