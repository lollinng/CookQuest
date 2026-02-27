import { Pool } from 'pg'
import path from 'path'
import fs from 'fs/promises'
import dotenv from 'dotenv'

dotenv.config()

async function reset() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://cookquest:cookquest@localhost:5432/cookquest',
  })

  try {
    // Drop all tables in dependency order (including migration tracking)
    await pool.query(`
      DROP TABLE IF EXISTS
        user_challenge_progress, recommendation_events, cooking_sessions,
        user_achievements, user_skill_progress, user_recipe_progress,
        recipe_reviews, user_preferences, user_sessions, user_recipe_photos,
        challenges, cooking_tips, achievements, recipes, skills, users,
        _migrations
      CASCADE
    `)
    console.log('All tables dropped')

    // Run migration
    const schemaPath = path.resolve(process.cwd(), '../../shared/schema-pg.sql')
    const schema = await fs.readFile(schemaPath, 'utf-8')
    await pool.query(schema)
    console.log('Migration applied')

    // Run seed
    const seedPath = path.resolve(process.cwd(), '../../shared/seed-data-pg.sql')
    const seedSql = await fs.readFile(seedPath, 'utf-8')
    await pool.query(seedSql)
    console.log('Seed data applied')

    console.log('Reset complete')
  } finally {
    await pool.end()
  }
}

reset().catch((err) => {
  console.error('Reset failed:', err)
  process.exit(1)
})
