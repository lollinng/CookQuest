import { Pool } from 'pg'
import path from 'path'
import fs from 'fs/promises'
import dotenv from 'dotenv'

dotenv.config()

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cookquest:cookquest@localhost:5432/cookquest',
  })

  try {
    const seedPath = path.resolve(process.cwd(), '../../shared/seed-data-pg.sql')
    const seedSql = await fs.readFile(seedPath, 'utf-8')
    await pool.query(seedSql)
    console.log('Seeding complete: seed-data-pg.sql applied successfully')
  } finally {
    await pool.end()
  }
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
