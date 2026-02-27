import { Pool, PoolClient } from 'pg'
import path from 'path'
import fs from 'fs/promises'
import { logger } from './logger'

export interface User {
  id: number
  email: string
  username: string
  password_hash: string
  created_at: string
  updated_at: string
  profile?: {
    display_name?: string
    avatar_url?: string
    dietary_preferences?: string[]
    skill_level?: 'beginner' | 'intermediate' | 'advanced'
  }
}

export interface Recipe {
  id: string
  title: string
  description: string
  skill: 'basic-cooking' | 'heat-control' | 'flavor-building' | 'air-fryer' | 'indian-cuisine'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  time: string
  image_url?: string
  emoji?: string
  ingredients: string[] | string
  instructions: string[] | string
  tips?: string[] | string
  xp_reward: number
  created_at: string
  updated_at: string
}

export interface UserProgress {
  id: number
  user_id: number
  recipe_id: string
  completed: boolean
  completed_at?: string
  rating?: number
  notes?: string
  created_at: string
  updated_at: string
}

class DatabaseServiceClass {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://cookquest:cookquest@localhost:5432/cookquest',
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    })

    // Log unexpected errors on idle clients instead of crashing
    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on idle database client')
    })
  }

  async initialize(): Promise<void> {
    const sharedDir = process.env.SHARED_DIR || path.resolve(process.cwd(), '../../shared')

    // Create migration tracking table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Run schema migration (only once)
    const schemaApplied = await this.isMigrationApplied('001_initial_schema')
    if (!schemaApplied) {
      const schemaPath = path.join(sharedDir, 'schema-pg.sql')
      const schema = await fs.readFile(schemaPath, 'utf-8')
      await this.pool.query(schema)
      await this.recordMigration('001_initial_schema')
      logger.info('Schema migration applied')
    }

    // Seed data (only once)
    const seedApplied = await this.isMigrationApplied('002_seed_data')
    if (!seedApplied) {
      const seedPath = path.join(sharedDir, 'seed-data-pg.sql')
      const seed = await fs.readFile(seedPath, 'utf-8')
      await this.pool.query(seed)
      await this.recordMigration('002_seed_data')
      logger.info('Database seeded successfully')
    }

    // User recipe photos table (migration 003)
    const photosApplied = await this.isMigrationApplied('003_user_recipe_photos')
    if (!photosApplied) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_recipe_photos (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
          photo_url TEXT NOT NULL,
          storage_key TEXT,
          caption TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, recipe_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_recipe_photos_user ON user_recipe_photos(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_recipe_photos_recipe ON user_recipe_photos(recipe_id);
      `)
      await this.recordMigration('003_user_recipe_photos')
      logger.info('Photos migration applied')
    }

    // Fix Indian cuisine recipe photos (migration 004)
    const photoFixApplied = await this.isMigrationApplied('004_fix_recipe_photos')
    if (!photoFixApplied) {
      await this.pool.query(`
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1626500154744-e4b394ffea16?w=800&fit=crop&q=80'
        WHERE id = 'dal-tadka';
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&fit=crop&q=80'
        WHERE id = 'butter-chicken';
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&fit=crop&q=80'
        WHERE id = 'jeera-rice';
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&fit=crop&q=80'
        WHERE id = 'aloo-gobi';
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&fit=crop&q=80'
        WHERE id = 'naan-bread';
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1582724790987-313797eb6119?w=800&fit=crop&q=80'
        WHERE id = 'chana-masala';
        UPDATE recipes SET image_url = 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800&fit=crop&q=80'
        WHERE id = 'mango-lassi';
      `)
      await this.recordMigration('004_fix_recipe_photos')
      logger.info('Recipe photos migration applied')
    }

    // Add xp_reward column and set values by difficulty (migration 005)
    const xpRewardApplied = await this.isMigrationApplied('005_add_xp_reward')
    if (!xpRewardApplied) {
      await this.pool.query(`
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 100;
        UPDATE recipes SET xp_reward = 100 WHERE difficulty = 'beginner';
        UPDATE recipes SET xp_reward = 150 WHERE difficulty = 'intermediate';
        UPDATE recipes SET xp_reward = 200 WHERE difficulty = 'advanced';
      `)
      await this.recordMigration('005_add_xp_reward')
      logger.info('XP reward migration applied')
    }

    logger.info('Database initialized (PostgreSQL)')
  }

  private async isMigrationApplied(name: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM _migrations WHERE name = $1',
      [name]
    )
    return rows.length > 0
  }

  private async recordMigration(name: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [name]
    )
  }

  // User methods
  async createUser(userData: { email: string; username: string; passwordHash: string; profile?: any }): Promise<User> {
    const profile = userData.profile || {}
    const { rows } = await this.pool.query(
      `INSERT INTO users (email, username, password_hash, preferences)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userData.email, userData.username, userData.passwordHash, JSON.stringify(profile)]
    )
    return this.getUserById(rows[0].id) as Promise<User>
  }

  async getUserById(id: number): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT id, email, username, password_hash, preferences as profile, created_at, updated_at FROM users WHERE id = $1',
      [id]
    )
    if (!rows[0]) return null
    return this._mapUser(rows[0])
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT id, email, username, password_hash, preferences as profile, created_at, updated_at FROM users WHERE email = $1',
      [email]
    )
    if (!rows[0]) return null
    return this._mapUser(rows[0])
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT id, email, username, password_hash, preferences as profile, created_at, updated_at FROM users WHERE username = $1',
      [username]
    )
    if (!rows[0]) return null
    return this._mapUser(rows[0])
  }

  private _mapUser(row: any): User {
    return {
      ...row,
      // preferences JSONB comes back as a native object; ensure profile shape
      profile: row.profile || {},
    }
  }

  // Recipe methods
  async getAllRecipes(): Promise<Recipe[]> {
    const { rows } = await this.pool.query(
      `SELECT id, title, description,
              skill_id AS skill,
              difficulty,
              total_time AS time,
              image_url, emoji,
              xp_reward,
              ingredients, instructions, tips,
              created_at, updated_at
       FROM recipes
       WHERE is_active = TRUE
       ORDER BY created_at DESC`
    )
    return rows.map(this._mapRecipe)
  }

  async getRecipeById(id: string): Promise<Recipe | null> {
    const { rows } = await this.pool.query(
      `SELECT id, title, description,
              skill_id AS skill,
              difficulty,
              total_time AS time,
              image_url, emoji,
              xp_reward,
              ingredients, instructions, tips,
              created_at, updated_at
       FROM recipes
       WHERE id = $1 AND is_active = TRUE`,
      [id]
    )
    if (!rows[0]) return null
    return this._mapRecipe(rows[0])
  }

  async getRecipesBySkill(skill: string): Promise<Recipe[]> {
    const { rows } = await this.pool.query(
      `SELECT id, title, description,
              skill_id AS skill,
              difficulty,
              total_time AS time,
              image_url, emoji,
              xp_reward,
              ingredients, instructions, tips,
              created_at, updated_at
       FROM recipes
       WHERE skill_id = $1 AND is_active = TRUE
       ORDER BY difficulty, created_at`,
      [skill]
    )
    return rows.map(this._mapRecipe)
  }

  private _mapRecipe(row: any): Recipe {
    return {
      ...row,
      // JSONB columns come back as native JS arrays — no JSON.parse needed
      ingredients: row.ingredients ?? [],
      instructions: row.instructions ?? [],
      tips: row.tips ?? [],
    }
  }

  // Skills methods
  async getAllSkills(): Promise<any[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM skills WHERE is_active = TRUE ORDER BY sort_order'
    )
    return rows
  }

  async getSkillById(id: string): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM skills WHERE id = $1',
      [id]
    )
    return rows[0] || null
  }

  // Progress methods
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    const { rows } = await this.pool.query(
      `SELECT id, user_id, recipe_id,
              (status IN ('completed', 'mastered')) AS completed,
              completed_at,
              notes,
              created_at, updated_at
       FROM user_recipe_progress
       WHERE user_id = $1`,
      [userId]
    )
    return rows
  }

  async getRecipeProgress(userId: number, recipeId: string): Promise<UserProgress | null> {
    const { rows } = await this.pool.query(
      `SELECT id, user_id, recipe_id,
              (status IN ('completed', 'mastered')) AS completed,
              completed_at,
              notes,
              created_at, updated_at
       FROM user_recipe_progress
       WHERE user_id = $1 AND recipe_id = $2`,
      [userId, recipeId]
    )
    return rows[0] || null
  }

  async updateRecipeProgress(userId: number, recipeId: string, data: Partial<UserProgress>): Promise<void> {
    const status = data.completed ? 'completed' : 'in_progress'
    await this.pool.query(
      `INSERT INTO user_recipe_progress (user_id, recipe_id, status, completed_at, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, recipe_id) DO UPDATE
         SET status       = EXCLUDED.status,
             completed_at = COALESCE(EXCLUDED.completed_at, user_recipe_progress.completed_at),
             notes        = COALESCE(EXCLUDED.notes, user_recipe_progress.notes),
             updated_at   = CURRENT_TIMESTAMP`,
      [userId, recipeId, status, data.completed_at || null, data.notes || null]
    )
  }

  async getRandomTip(type?: string): Promise<{ id: number; content: string; type: string } | null> {
    // Map old 'type' filter to new 'category' column
    // In the new schema: tips have 'category' not 'type'
    // type 'joke'/'fact' → category 'general'; others map 1:1
    let query: string
    let params: any[]

    if (type) {
      const categoryMap: Record<string, string> = {
        joke: 'general',
        fact: 'general',
        tip: 'technique',
      }
      const category = categoryMap[type] || type
      query = `SELECT id, content, category AS type FROM cooking_tips
               WHERE is_active = TRUE AND category = $1
               ORDER BY RANDOM() LIMIT 1`
      params = [category]
    } else {
      query = `SELECT id, content, category AS type FROM cooking_tips
               WHERE is_active = TRUE
               ORDER BY RANDOM() LIMIT 1`
      params = []
    }

    const { rows } = await this.pool.query(query, params)
    return rows[0] || null
  }

  // Photo methods
  async getUserRecipePhotos(userId: number): Promise<{ recipe_id: string; photo_url: string; uploaded_at: string }[]> {
    const { rows } = await this.pool.query(
      'SELECT recipe_id, photo_url, uploaded_at FROM user_recipe_photos WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [userId]
    )
    return rows
  }

  async upsertRecipePhoto(userId: number, recipeId: string, photoUrl: string, storageKey: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_recipe_photos (user_id, recipe_id, photo_url, storage_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, recipe_id) DO UPDATE
         SET photo_url   = EXCLUDED.photo_url,
             storage_key = EXCLUDED.storage_key,
             uploaded_at = CURRENT_TIMESTAMP`,
      [userId, recipeId, photoUrl, storageKey]
    )
  }

  async deleteRecipePhoto(userId: number, recipeId: string): Promise<{ storageKey: string } | null> {
    const { rows } = await this.pool.query(
      'DELETE FROM user_recipe_photos WHERE user_id = $1 AND recipe_id = $2 RETURNING storage_key',
      [userId, recipeId]
    )
    return rows[0] ? { storageKey: rows[0].storage_key } : null
  }

  // Session cleanup — remove expired sessions
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.pool.query('DELETE FROM user_sessions WHERE expires_at < NOW()')
    return result.rowCount || 0
  }

  // Generic query helpers (used by routes that haven't been fully migrated)
  async all(query: string, params: any[] = []): Promise<any[]> {
    const { rows } = await this.pool.query(query, params)
    return rows
  }

  async get(query: string, params: any[] = []): Promise<any | null> {
    const { rows } = await this.pool.query(query, params)
    return rows[0] || null
  }

  // Transaction helper — executes fn within BEGIN/COMMIT, auto-rolls back on error
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Health check — lightweight ping for readiness probes
  async isHealthy(): Promise<boolean> {
    try {
      const { rows } = await this.pool.query('SELECT 1 AS ok')
      return rows.length > 0
    } catch {
      return false
    }
  }

  // Pool stats for monitoring
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    }
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

// Create singleton instance
export const DatabaseService = new DatabaseServiceClass()
