import pg from 'pg'

const { Client } = pg

async function runMigration() {
  const client = new Client({
    host: 'db.goegbuyfwoqkzszkfyzy.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to database...')
    await client.connect()

    console.log('Adding admin to plan_tier enum...')
    await client.query("ALTER TYPE plan_tier ADD VALUE IF NOT EXISTS 'admin'")
    console.log('Enum updated!')

    console.log('Updating admin company...')
    const result = await client.query(`
      UPDATE companies
      SET actual_plan = 'admin'
      WHERE id IN (
        SELECT company_id FROM users WHERE is_system_admin = true
      )
      RETURNING id, name, actual_plan
    `)

    console.log('Updated companies:', result.rows)
    console.log('Done!')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await client.end()
  }
}

runMigration()
