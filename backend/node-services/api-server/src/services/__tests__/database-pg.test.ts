/**
 * PostgreSQL DatabaseService tests
 * Tests the pg-based DatabaseService to ensure correct behavior.
 * Uses mocked Pool to avoid needing a real PG connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted() so these are available when vi.mock factories run (hoisted above imports)
const { mockQuery, mockEnd } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEnd: vi.fn(),
}))

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: mockQuery,
    end: mockEnd,
    on: vi.fn(),
    connect: vi.fn().mockResolvedValue({
      query: mockQuery,
      release: vi.fn(),
    }),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  })),
}))

const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn().mockResolvedValue('-- mock SQL'),
}))

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
  },
  readFile: mockReadFile,
}))

// Also mock the logger to avoid noise
vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { DatabaseService } from '../database'

describe('DatabaseService (PostgreSQL)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })
  })

  describe('initialize()', () => {
    it('creates the _migrations table on startup', async () => {
      await DatabaseService.initialize()

      const migrationsCreate = mockQuery.mock.calls.find(([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('CREATE TABLE IF NOT EXISTS _migrations')
      )
      expect(migrationsCreate).toBeDefined()
    })

    it('applies schema migration when not previously recorded', async () => {
      // _migrations check returns empty -> migration not applied
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 })

      await DatabaseService.initialize()

      expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('schema-pg.sql'), 'utf-8')
    })

    it('skips schema migration when already recorded', async () => {
      // Any SELECT from _migrations returns a row (migration applied)
      mockQuery.mockImplementation((sql: string) => {
        if (typeof sql === 'string' && sql.includes('SELECT 1 FROM _migrations')) {
          return Promise.resolve({ rows: [{ 1: 1 }], rowCount: 1 })
        }
        return Promise.resolve({ rows: [], rowCount: 0 })
      })

      await DatabaseService.initialize()

      expect(mockReadFile).not.toHaveBeenCalled()
    })
  })

  describe('getAllRecipes()', () => {
    it('returns recipes with JSONB fields as native arrays', async () => {
      await DatabaseService.initialize()

      const mockRecipes = [
        {
          id: 'boiled-egg',
          title: 'Perfect Boiled Egg',
          skill: 'basic-cooking',
          difficulty: 'beginner',
          time: '10 minutes',
          ingredients: ['2 large eggs', 'Water'],
          instructions: ['Boil water', 'Add eggs'],
          tips: ['Use week-old eggs'],
        },
      ]
      mockQuery.mockResolvedValueOnce({ rows: mockRecipes, rowCount: 1 })

      const recipes = await DatabaseService.getAllRecipes()
      expect(recipes).toHaveLength(1)
      expect(Array.isArray(recipes[0].ingredients)).toBe(true)
      expect(Array.isArray(recipes[0].instructions)).toBe(true)
    })
  })

  describe('getRecipeById()', () => {
    it('returns null for non-existent recipe', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const recipe = await DatabaseService.getRecipeById('nonexistent')
      expect(recipe).toBeNull()
    })

    it('uses $1 parameter placeholder', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await DatabaseService.getRecipeById('boiled-egg')

      const call = mockQuery.mock.calls.find(([sql, params]: [string, any[]]) =>
        typeof sql === 'string' &&
        sql.includes('FROM recipes') &&
        sql.includes('WHERE id = $1') &&
        Array.isArray(params) && params[0] === 'boiled-egg'
      )
      expect(call).toBeDefined()
      expect(call![0]).toContain('$1')
    })
  })

  describe('updateRecipeProgress() UPSERT', () => {
    it('uses ON CONFLICT DO UPDATE instead of separate INSERT/UPDATE', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })

      await DatabaseService.updateRecipeProgress(1, 'boiled-egg', {
        completed: true,
        completed_at: new Date().toISOString(),
      })

      const upsertCall = mockQuery.mock.calls.find(([sql]: [string]) =>
        typeof sql === 'string' &&
        sql.includes('user_recipe_progress') &&
        sql.includes('ON CONFLICT')
      )
      expect(upsertCall).toBeDefined()
      expect(upsertCall![0]).toContain('DO UPDATE')
    })
  })

  describe('createUser()', () => {
    it('uses RETURNING id to get created user ID', async () => {
      await DatabaseService.initialize()
      // RETURNING id from INSERT
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 })
      // getUserById call
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 42, email: 'test@example.com', username: 'testuser',
          password_hash: 'hash', profile: {},
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
      })

      const user = await DatabaseService.createUser({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash',
      })

      const insertCall = mockQuery.mock.calls.find(([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('INSERT INTO users') && sql.includes('RETURNING id')
      )
      expect(insertCall).toBeDefined()
      expect(user.id).toBe(42)
    })
  })

  describe('getUserById()', () => {
    it('returns user with profile as native object (no JSON.parse needed)', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@example.com',
          username: 'user',
          password_hash: 'hash',
          profile: { display_name: 'User', skill_level: 'beginner' }, // Native JSONB object
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
        rowCount: 1,
      })

      const user = await DatabaseService.getUserById(1)
      expect(user).not.toBeNull()
      expect(typeof user!.profile).toBe('object')
      expect(user!.profile!.display_name).toBe('User')
    })
  })

  describe('getRandomTip()', () => {
    it('queries with RANDOM() for PostgreSQL', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, content: 'Test tip', type: 'technique' }],
        rowCount: 1,
      })

      await DatabaseService.getRandomTip()

      const call = mockQuery.mock.calls.find(([sql]: [string]) =>
        typeof sql === 'string' && sql.includes('RANDOM()')
      )
      expect(call).toBeDefined()
    })

    it('filters by category when type is specified', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      await DatabaseService.getRandomTip('tip')

      const call = mockQuery.mock.calls.find(([sql, params]: [string, any[]]) =>
        typeof sql === 'string' &&
        sql.includes('category') &&
        Array.isArray(params) && params.includes('technique')
      )
      expect(call).toBeDefined()
    })
  })

  describe('generic helpers', () => {
    it('all() returns rows array', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2 })

      const result = await DatabaseService.all('SELECT id FROM users')
      expect(result).toHaveLength(2)
    })

    it('get() returns first row or null', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })

      const result = await DatabaseService.get('SELECT id FROM users WHERE id = $1', [1])
      expect(result).toEqual({ id: 1 })
    })

    it('get() returns null when no rows', async () => {
      await DatabaseService.initialize()
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })

      const result = await DatabaseService.get('SELECT id FROM users WHERE id = $1', [999])
      expect(result).toBeNull()
    })
  })

  describe('close()', () => {
    it('calls pool.end() to release connections', async () => {
      await DatabaseService.initialize()
      mockEnd.mockResolvedValue(undefined)

      await DatabaseService.close()
      expect(mockEnd).toHaveBeenCalledTimes(1)
    })
  })
})
