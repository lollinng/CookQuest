import { Pool } from 'pg'
import path from 'path'
import fs from 'fs/promises'
import dotenv from 'dotenv'

dotenv.config()

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cookquest:cookquest@localhost:5432/cookquest',
  })

  try {
    const schemaPath = path.resolve(process.cwd(), '../../shared/schema-pg.sql')
    const schema = await fs.readFile(schemaPath, 'utf-8')
    await pool.query(schema)
    console.log('Migration complete: schema-pg.sql applied successfully')
  } finally {
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
