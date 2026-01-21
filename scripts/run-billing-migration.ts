/**
 * Run billing plan migration via direct PostgreSQL connection
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const PROJECT_REF = 'goegbuyfwoqkzszkfyzy'
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD

async function runMigration() {
  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250120000000_billing_plans.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  console.log('Running billing plans migration...')
  console.log('SQL length:', sql.length, 'characters')

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

    console.log('Running migration...')
    await client.query(sql)

    console.log('Migration completed successfully!')
    client.release()
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await pool.end()
  }
}

runMigration()
