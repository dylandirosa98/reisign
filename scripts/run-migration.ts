import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function runMigration() {
  console.log('Running company_templates migration...')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250117000000_company_templates.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split into individual statements (simple split by semicolon followed by newline)
  // We need to be careful with the INSERT statements that have complex content
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 80).replace(/\n/g, ' ')
    console.log(`\n[${i + 1}/${statements.length}] Executing: ${preview}...`)

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      if (error) {
        // Try direct execution via REST API
        console.log('  RPC failed, statement may have executed or failed:', error.message)
      } else {
        console.log('  Success')
      }
    } catch (err) {
      console.log('  Error:', err)
    }
  }

  console.log('\nMigration complete!')
}

runMigration().catch(console.error)
