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
  is_allowed: boolean
  is_admin: boolean
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
  structured_ingredients?: StructuredIngredient[]
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

export interface StructuredIngredient {
  id: number
  name: string
  category: string | null
  amount: number | null
  unit: string | null
  preparation: string | null
  optional: boolean
  sort_order: number
  notes: string | null
}

export interface Ingredient {
  id: number
  name: string
  category: string | null
  created_at: string
}

class DatabaseServiceClass {
  private pool: Pool

  constructor() {
    const instanceConnection = process.env.INSTANCE_CONNECTION_NAME;
    const poolConfig: any = {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT || '5000', 10),
    };

    if (instanceConnection) {
      // Cloud SQL Unix socket connection
      poolConfig.host = `/cloudsql/${instanceConnection}`;
      poolConfig.user = process.env.DB_USER || 'cookquest';
      poolConfig.password = process.env.DB_PASSWORD;
      poolConfig.database = process.env.DB_NAME || 'cookquest';
      logger.info({ instance: instanceConnection }, 'Connecting to Cloud SQL via Unix socket');
    } else {
      poolConfig.connectionString = process.env.DATABASE_URL || 'postgresql://cookquest:cookquest@localhost:5432/cookquest';
    }

    this.pool = new Pool(poolConfig)

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

    // Add skill dependency columns (migration 006)
    const skillDepsApplied = await this.isMigrationApplied('006_skill_dependencies')
    if (!skillDepsApplied) {
      await this.pool.query(`
        ALTER TABLE skills ADD COLUMN IF NOT EXISTS required_skill_id TEXT REFERENCES skills(id);
        ALTER TABLE skills ADD COLUMN IF NOT EXISTS required_recipes_completed INTEGER DEFAULT 0;
        UPDATE skills SET required_skill_id = NULL, required_recipes_completed = 0 WHERE id = 'basic-cooking';
        UPDATE skills SET required_skill_id = 'basic-cooking', required_recipes_completed = 3 WHERE id IN ('heat-control', 'flavor-building', 'air-fryer', 'indian-cuisine');
      `)
      await this.recordMigration('006_skill_dependencies')
      logger.info('Skill dependencies migration applied')
    }

    // Seed admin user for development (migration 007)
    const adminSeedApplied = await this.isMigrationApplied('007_seed_admin_user')
    if (!adminSeedApplied) {
      await this.pool.query(`
        INSERT INTO users (email, username, password_hash, display_name, is_active, email_verified)
        VALUES ('admin@cookquest.dev', 'admin', '$2a$12$0UbEaOYvE6n6dLHWdAY0yel9G3ENT16Jnv25kt185imMyvovQF.fe', 'Chef Admin', TRUE, TRUE)
        ON CONFLICT (email) DO NOTHING;
      `)
      await this.recordMigration('007_seed_admin_user')
      logger.info('Admin user seeded (admin@cookquest.dev / Admin123!)')
    }

    // Ingredients tables (migration 008)
    const ingredientsApplied = await this.isMigrationApplied('008_ingredients_tables')
    if (!ingredientsApplied) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ingredients (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          category TEXT CHECK (category IN ('protein', 'dairy', 'produce', 'grain', 'spice', 'herb', 'oil', 'seasoning', 'sauce', 'baking', 'other')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
        CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);

        CREATE TABLE IF NOT EXISTS recipe_ingredients (
          id SERIAL PRIMARY KEY,
          recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
          ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
          amount DECIMAL,
          unit TEXT,
          preparation TEXT,
          optional BOOLEAN DEFAULT FALSE,
          sort_order INTEGER DEFAULT 0,
          notes TEXT,
          UNIQUE(recipe_id, ingredient_id)
        );
        CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
      `)
      await this.recordMigration('008_ingredients_tables')
      logger.info('Ingredients tables migration applied')
    }

    // Seed ingredient data for all 22 recipes (migration 009)
    const ingredientSeedApplied = await this.isMigrationApplied('009_seed_ingredients')
    if (!ingredientSeedApplied) {
      await this.transaction(async (client) => {
        // Insert all unique ingredients into master catalog
        await client.query(`
          INSERT INTO ingredients (name, category) VALUES
          -- Proteins
          ('eggs', 'protein'),
          ('chicken thighs', 'protein'),
          ('chicken wings', 'protein'),
          ('chicken pieces', 'protein'),
          ('ribeye steak', 'protein'),
          ('salmon fillets', 'protein'),
          ('tofu', 'protein'),
          ('chickpeas', 'protein'),
          ('toor dal', 'protein'),
          -- Dairy
          ('butter', 'dairy'),
          ('ghee', 'dairy'),
          ('yogurt', 'dairy'),
          ('cream', 'dairy'),
          ('milk', 'dairy'),
          ('parmesan cheese', 'dairy'),
          -- Produce
          ('onion', 'produce'),
          ('garlic', 'produce'),
          ('potatoes', 'produce'),
          ('cauliflower', 'produce'),
          ('broccoli florets', 'produce'),
          ('bell pepper', 'produce'),
          ('zucchini', 'produce'),
          ('mushrooms', 'produce'),
          ('tomato puree', 'produce'),
          ('mango pulp', 'produce'),
          ('lemon', 'produce'),
          ('ginger', 'produce'),
          ('green chilies', 'produce'),
          ('dried red chilies', 'produce'),
          ('mixed vegetables', 'produce'),
          ('cilantro', 'produce'),
          ('russet potatoes', 'produce'),
          -- Grains
          ('long-grain white rice', 'grain'),
          ('basmati rice', 'grain'),
          ('flour', 'grain'),
          ('biscuit dough', 'grain'),
          ('grains or pasta', 'grain'),
          -- Spices
          ('turmeric', 'spice'),
          ('cumin seeds', 'spice'),
          ('mustard seeds', 'spice'),
          ('garam masala', 'spice'),
          ('paprika', 'spice'),
          ('coriander powder', 'spice'),
          ('red chili powder', 'spice'),
          ('kashmiri chili powder', 'spice'),
          ('cardamom', 'spice'),
          ('cinnamon', 'spice'),
          ('nutmeg', 'spice'),
          ('kasuri methi', 'spice'),
          ('amchur powder', 'spice'),
          ('saffron', 'spice'),
          ('garlic powder', 'spice'),
          ('cumin powder', 'spice'),
          ('cardamom powder', 'spice'),
          ('whole spices', 'spice'),
          ('ground spices', 'spice'),
          -- Herbs
          ('thyme', 'herb'),
          ('rosemary', 'herb'),
          ('basil', 'herb'),
          ('oregano', 'herb'),
          ('bay leaf', 'herb'),
          ('fresh herbs', 'herb'),
          ('dried spices', 'herb'),
          -- Oils
          ('olive oil', 'oil'),
          ('vegetable oil', 'oil'),
          ('sesame oil', 'oil'),
          ('oil', 'oil'),
          -- Seasonings
          ('salt', 'seasoning'),
          ('black pepper', 'seasoning'),
          ('sugar', 'seasoning'),
          ('honey', 'seasoning'),
          -- Sauces
          ('soy sauce', 'sauce'),
          ('fish sauce', 'sauce'),
          ('tomato paste', 'sauce'),
          ('miso paste', 'sauce'),
          ('wing sauce', 'sauce'),
          ('wine or stock', 'sauce'),
          ('ginger-garlic paste', 'sauce'),
          -- Baking
          ('baking powder', 'baking'),
          ('cornstarch', 'baking'),
          ('yeast', 'baking'),
          -- Other
          ('water', 'other'),
          ('ice', 'other'),
          ('broth', 'other'),
          ('pan drippings', 'other'),
          ('ice cubes', 'other'),
          ('warm water', 'other')
          ON CONFLICT (name) DO NOTHING
        `)

        // boiled-egg: 2 large eggs, Water (enough to cover), Salt (pinch), Ice water for cooling
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('boiled-egg', (SELECT id FROM ingredients WHERE name = 'eggs'), 2, NULL, NULL, FALSE, 1, 'large'),
          ('boiled-egg', (SELECT id FROM ingredients WHERE name = 'water'), NULL, NULL, NULL, FALSE, 2, 'enough to cover eggs'),
          ('boiled-egg', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, 'pinch', NULL, FALSE, 3, NULL),
          ('boiled-egg', (SELECT id FROM ingredients WHERE name = 'ice'), NULL, NULL, NULL, FALSE, 4, 'ice water for cooling')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // make-rice: 1 cup long-grain white rice, 2 cups water, 1/2 tsp salt, 1 tbsp butter (optional)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('make-rice', (SELECT id FROM ingredients WHERE name = 'long-grain white rice'), 1, 'cup', NULL, FALSE, 1, NULL),
          ('make-rice', (SELECT id FROM ingredients WHERE name = 'water'), 2, 'cup', NULL, FALSE, 2, NULL),
          ('make-rice', (SELECT id FROM ingredients WHERE name = 'salt'), 0.5, 'teaspoon', NULL, FALSE, 3, NULL),
          ('make-rice', (SELECT id FROM ingredients WHERE name = 'butter'), 1, 'tablespoon', NULL, TRUE, 4, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // chop-onion: 1 medium yellow onion (skip knife/cutting board — tools, not ingredients)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('chop-onion', (SELECT id FROM ingredients WHERE name = 'onion'), 1, NULL, NULL, FALSE, 1, 'medium yellow')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // sear-steak: 2 steaks, 2 tbsp veg oil, salt+pepper, 2 tbsp butter, 2 garlic cloves, fresh thyme
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'ribeye steak'), 2, NULL, NULL, FALSE, 1, '1-inch thick, ribeye or NY strip'),
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'vegetable oil'), 2, 'tablespoon', NULL, FALSE, 2, NULL),
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 3, NULL),
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'black pepper'), NULL, NULL, 'freshly ground', FALSE, 4, NULL),
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'butter'), 2, 'tablespoon', NULL, FALSE, 5, NULL),
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'garlic'), 2, 'clove', NULL, FALSE, 6, NULL),
          ('sear-steak', (SELECT id FROM ingredients WHERE name = 'thyme'), NULL, NULL, 'fresh sprigs', FALSE, 7, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // simmer-soup: 4 cups broth, 1 cup diced veg, 1/2 cup grains or pasta, herbs and seasonings
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('simmer-soup', (SELECT id FROM ingredients WHERE name = 'broth'), 4, 'cup', NULL, FALSE, 1, 'chicken or vegetable'),
          ('simmer-soup', (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 1, 'cup', 'diced', FALSE, 2, NULL),
          ('simmer-soup', (SELECT id FROM ingredients WHERE name = 'grains or pasta'), 0.5, 'cup', NULL, FALSE, 3, NULL),
          ('simmer-soup', (SELECT id FROM ingredients WHERE name = 'fresh herbs'), NULL, NULL, NULL, FALSE, 4, 'herbs and seasonings')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // deep-fry: oil, thermometer(skip), food(skip), paper towels(skip), wire rack(skip)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('deep-fry', (SELECT id FROM ingredients WHERE name = 'oil'), NULL, NULL, NULL, FALSE, 1, 'neutral oil for frying')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // stir-fry: 2 cups mixed veg, 2 tbsp oil, sauce ingredients, protein (optional)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('stir-fry', (SELECT id FROM ingredients WHERE name = 'mixed vegetables'), 2, 'cup', NULL, FALSE, 1, NULL),
          ('stir-fry', (SELECT id FROM ingredients WHERE name = 'oil'), 2, 'tablespoon', NULL, FALSE, 2, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // grill-chicken: chicken pieces, marinade, oil for grates
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('grill-chicken', (SELECT id FROM ingredients WHERE name = 'chicken pieces'), NULL, NULL, NULL, FALSE, 1, NULL),
          ('grill-chicken', (SELECT id FROM ingredients WHERE name = 'oil'), NULL, NULL, NULL, FALSE, 2, 'for grates')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // make-sauce: pan drippings, 1/4 cup wine or stock, 2 tbsp butter, herbs/seasonings
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('make-sauce', (SELECT id FROM ingredients WHERE name = 'pan drippings'), NULL, NULL, NULL, FALSE, 1, NULL),
          ('make-sauce', (SELECT id FROM ingredients WHERE name = 'wine or stock'), 0.25, 'cup', NULL, FALSE, 2, NULL),
          ('make-sauce', (SELECT id FROM ingredients WHERE name = 'butter'), 2, 'tablespoon', NULL, FALSE, 3, NULL),
          ('make-sauce', (SELECT id FROM ingredients WHERE name = 'fresh herbs'), NULL, NULL, NULL, FALSE, 4, 'herbs and seasonings')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // season-taste: salt, acid (lemon/vinegar), fat (butter/oil), heat (pepper/spice)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('season-taste', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 1, NULL),
          ('season-taste', (SELECT id FROM ingredients WHERE name = 'lemon'), NULL, NULL, NULL, FALSE, 2, 'lemon juice or vinegar'),
          ('season-taste', (SELECT id FROM ingredients WHERE name = 'butter'), NULL, NULL, NULL, FALSE, 3, 'butter or oil'),
          ('season-taste', (SELECT id FROM ingredients WHERE name = 'black pepper'), NULL, NULL, NULL, FALSE, 4, 'pepper or spice for heat')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // herb-pairing: fresh herbs (basil, thyme, rosemary), dried spices (cumin, paprika, oregano), base ingredients
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('herb-pairing', (SELECT id FROM ingredients WHERE name = 'basil'), NULL, NULL, 'fresh', FALSE, 1, NULL),
          ('herb-pairing', (SELECT id FROM ingredients WHERE name = 'thyme'), NULL, NULL, 'fresh', FALSE, 2, NULL),
          ('herb-pairing', (SELECT id FROM ingredients WHERE name = 'rosemary'), NULL, NULL, 'fresh', FALSE, 3, NULL),
          ('herb-pairing', (SELECT id FROM ingredients WHERE name = 'cumin seeds'), NULL, NULL, 'dried', FALSE, 4, NULL),
          ('herb-pairing', (SELECT id FROM ingredients WHERE name = 'paprika'), NULL, NULL, 'dried', FALSE, 5, NULL),
          ('herb-pairing', (SELECT id FROM ingredients WHERE name = 'oregano'), NULL, NULL, 'dried', FALSE, 6, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // spice-blend: whole spices, ground spices, salt, sugar (optional)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('spice-blend', (SELECT id FROM ingredients WHERE name = 'whole spices'), NULL, NULL, NULL, FALSE, 1, NULL),
          ('spice-blend', (SELECT id FROM ingredients WHERE name = 'ground spices'), NULL, NULL, NULL, FALSE, 2, NULL),
          ('spice-blend', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 3, NULL),
          ('spice-blend', (SELECT id FROM ingredients WHERE name = 'sugar'), NULL, NULL, NULL, TRUE, 4, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // marinate: acid (citrus/vinegar/wine), oil, aromatics (herbs/garlic), salt, protein or vegetables
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('marinate', (SELECT id FROM ingredients WHERE name = 'lemon'), NULL, NULL, NULL, FALSE, 1, 'citrus, vinegar, or wine'),
          ('marinate', (SELECT id FROM ingredients WHERE name = 'oil'), NULL, NULL, NULL, FALSE, 2, NULL),
          ('marinate', (SELECT id FROM ingredients WHERE name = 'garlic'), NULL, NULL, NULL, FALSE, 3, 'aromatics: herbs and garlic'),
          ('marinate', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 4, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // balance-flavors: salt, sugar/honey, acid (lemon/vinegar), bitter elements
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('balance-flavors', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 1, NULL),
          ('balance-flavors', (SELECT id FROM ingredients WHERE name = 'sugar'), NULL, NULL, NULL, FALSE, 2, 'or honey'),
          ('balance-flavors', (SELECT id FROM ingredients WHERE name = 'lemon'), NULL, NULL, NULL, FALSE, 3, 'lemon or vinegar'),
          ('balance-flavors', (SELECT id FROM ingredients WHERE name = 'fresh herbs'), NULL, NULL, NULL, FALSE, 4, 'bitter greens or herbs')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // umami-boost: mushrooms, tomato paste, parmesan, soy sauce, fish sauce, miso paste
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('umami-boost', (SELECT id FROM ingredients WHERE name = 'mushrooms'), NULL, NULL, NULL, FALSE, 1, NULL),
          ('umami-boost', (SELECT id FROM ingredients WHERE name = 'tomato paste'), NULL, NULL, NULL, FALSE, 2, NULL),
          ('umami-boost', (SELECT id FROM ingredients WHERE name = 'parmesan cheese'), NULL, NULL, NULL, FALSE, 3, NULL),
          ('umami-boost', (SELECT id FROM ingredients WHERE name = 'soy sauce'), NULL, NULL, NULL, FALSE, 4, NULL),
          ('umami-boost', (SELECT id FROM ingredients WHERE name = 'fish sauce'), NULL, NULL, NULL, FALSE, 5, NULL),
          ('umami-boost', (SELECT id FROM ingredients WHERE name = 'miso paste'), NULL, NULL, NULL, FALSE, 6, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // air-fryer-fries: 2 large russet potatoes, 1 tbsp olive oil, 1/2 tsp salt, 1/4 tsp paprika, 1/4 tsp garlic powder
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('air-fryer-fries', (SELECT id FROM ingredients WHERE name = 'russet potatoes'), 2, NULL, NULL, FALSE, 1, 'large'),
          ('air-fryer-fries', (SELECT id FROM ingredients WHERE name = 'olive oil'), 1, 'tablespoon', NULL, FALSE, 2, NULL),
          ('air-fryer-fries', (SELECT id FROM ingredients WHERE name = 'salt'), 0.5, 'teaspoon', NULL, FALSE, 3, NULL),
          ('air-fryer-fries', (SELECT id FROM ingredients WHERE name = 'paprika'), 0.25, 'teaspoon', NULL, FALSE, 4, NULL),
          ('air-fryer-fries', (SELECT id FROM ingredients WHERE name = 'garlic powder'), 0.25, 'teaspoon', NULL, FALSE, 5, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // air-fryer-chicken-wings: 2 lbs wings, 1 tbsp baking powder, 1 tsp salt, 1/2 tsp pepper, 1/2 tsp garlic powder, wing sauce
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('air-fryer-chicken-wings', (SELECT id FROM ingredients WHERE name = 'chicken wings'), 2, 'pound', NULL, FALSE, 1, NULL),
          ('air-fryer-chicken-wings', (SELECT id FROM ingredients WHERE name = 'baking powder'), 1, 'tablespoon', NULL, FALSE, 2, NULL),
          ('air-fryer-chicken-wings', (SELECT id FROM ingredients WHERE name = 'salt'), 1, 'teaspoon', NULL, FALSE, 3, NULL),
          ('air-fryer-chicken-wings', (SELECT id FROM ingredients WHERE name = 'black pepper'), 0.5, 'teaspoon', NULL, FALSE, 4, NULL),
          ('air-fryer-chicken-wings', (SELECT id FROM ingredients WHERE name = 'garlic powder'), 0.5, 'teaspoon', NULL, FALSE, 5, NULL),
          ('air-fryer-chicken-wings', (SELECT id FROM ingredients WHERE name = 'wing sauce'), NULL, NULL, NULL, FALSE, 6, 'your favorite')
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // air-fryer-salmon: 2 fillets (6oz), 2 tbsp soy sauce, 1 tbsp honey, 1 tsp sesame oil, 1/2 tsp ginger, 1 clove garlic
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('air-fryer-salmon', (SELECT id FROM ingredients WHERE name = 'salmon fillets'), 2, NULL, NULL, FALSE, 1, '6 oz each'),
          ('air-fryer-salmon', (SELECT id FROM ingredients WHERE name = 'soy sauce'), 2, 'tablespoon', NULL, FALSE, 2, NULL),
          ('air-fryer-salmon', (SELECT id FROM ingredients WHERE name = 'honey'), 1, 'tablespoon', NULL, FALSE, 3, NULL),
          ('air-fryer-salmon', (SELECT id FROM ingredients WHERE name = 'sesame oil'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('air-fryer-salmon', (SELECT id FROM ingredients WHERE name = 'ginger'), 0.5, 'teaspoon', 'grated', FALSE, 5, NULL),
          ('air-fryer-salmon', (SELECT id FROM ingredients WHERE name = 'garlic'), 1, 'clove', 'minced', FALSE, 6, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // air-fryer-vegetables: 2 cups broccoli, 1 cup bell pepper, 1 cup zucchini, 1 tbsp olive oil, 1/2 tsp salt, 1/4 tsp pepper
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('air-fryer-vegetables', (SELECT id FROM ingredients WHERE name = 'broccoli florets'), 2, 'cup', NULL, FALSE, 1, NULL),
          ('air-fryer-vegetables', (SELECT id FROM ingredients WHERE name = 'bell pepper'), 1, 'cup', 'strips', FALSE, 2, NULL),
          ('air-fryer-vegetables', (SELECT id FROM ingredients WHERE name = 'zucchini'), 1, 'cup', 'sliced', FALSE, 3, NULL),
          ('air-fryer-vegetables', (SELECT id FROM ingredients WHERE name = 'olive oil'), 1, 'tablespoon', NULL, FALSE, 4, NULL),
          ('air-fryer-vegetables', (SELECT id FROM ingredients WHERE name = 'salt'), 0.5, 'teaspoon', NULL, FALSE, 5, NULL),
          ('air-fryer-vegetables', (SELECT id FROM ingredients WHERE name = 'black pepper'), 0.25, 'teaspoon', NULL, FALSE, 6, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // air-fryer-tofu: 1 block tofu (14oz), 1 tbsp soy sauce, 1 tbsp cornstarch, 1 tsp sesame oil, 1/2 tsp garlic powder
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('air-fryer-tofu', (SELECT id FROM ingredients WHERE name = 'tofu'), 1, 'block', NULL, FALSE, 1, 'extra-firm, 14 oz'),
          ('air-fryer-tofu', (SELECT id FROM ingredients WHERE name = 'soy sauce'), 1, 'tablespoon', NULL, FALSE, 2, NULL),
          ('air-fryer-tofu', (SELECT id FROM ingredients WHERE name = 'cornstarch'), 1, 'tablespoon', NULL, FALSE, 3, NULL),
          ('air-fryer-tofu', (SELECT id FROM ingredients WHERE name = 'sesame oil'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('air-fryer-tofu', (SELECT id FROM ingredients WHERE name = 'garlic powder'), 0.5, 'teaspoon', NULL, FALSE, 5, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // air-fryer-donuts: 1 can biscuit dough, 2 tbsp melted butter, 1/4 cup sugar, 1 tsp cinnamon, 1/4 tsp nutmeg
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('air-fryer-donuts', (SELECT id FROM ingredients WHERE name = 'biscuit dough'), 1, 'can', NULL, FALSE, 1, 'refrigerated'),
          ('air-fryer-donuts', (SELECT id FROM ingredients WHERE name = 'butter'), 2, 'tablespoon', 'melted', FALSE, 2, NULL),
          ('air-fryer-donuts', (SELECT id FROM ingredients WHERE name = 'sugar'), 0.25, 'cup', NULL, FALSE, 3, 'granulated'),
          ('air-fryer-donuts', (SELECT id FROM ingredients WHERE name = 'cinnamon'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('air-fryer-donuts', (SELECT id FROM ingredients WHERE name = 'nutmeg'), 0.25, 'teaspoon', NULL, FALSE, 5, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // dal-tadka: 1 cup toor dal, 1/2 tsp turmeric, 2 tbsp ghee, 1 tsp cumin seeds, 1/2 tsp mustard seeds,
        //   2 dried red chilies, 1 onion (chopped), 3 garlic cloves, 2 green chilies, cilantro, salt
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'toor dal'), 1, 'cup', NULL, FALSE, 1, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'turmeric'), 0.5, 'teaspoon', NULL, FALSE, 2, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'ghee'), 2, 'tablespoon', NULL, FALSE, 3, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'cumin seeds'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'mustard seeds'), 0.5, 'teaspoon', NULL, FALSE, 5, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'dried red chilies'), 2, NULL, NULL, FALSE, 6, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'onion'), 1, NULL, 'chopped', FALSE, 7, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'garlic'), 3, 'clove', NULL, FALSE, 8, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'green chilies'), 2, NULL, NULL, FALSE, 9, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'cilantro'), NULL, NULL, 'fresh', FALSE, 10, NULL),
          ('dal-tadka', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 11, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // butter-chicken: 500g chicken thighs, 1/2 cup yogurt, 2 tsp garam masala, 1 tsp turmeric,
        //   1 tsp kashmiri chili powder, 2 tbsp butter, 1 cup tomato puree, 1/2 cup cream,
        //   1 tsp kasuri methi, 1 tsp honey, salt
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'chicken thighs'), 500, 'gram', NULL, FALSE, 1, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'yogurt'), 0.5, 'cup', NULL, FALSE, 2, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'garam masala'), 2, 'teaspoon', NULL, FALSE, 3, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'turmeric'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'kashmiri chili powder'), 1, 'teaspoon', NULL, FALSE, 5, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'butter'), 2, 'tablespoon', NULL, FALSE, 6, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'tomato puree'), 1, 'cup', NULL, FALSE, 7, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'cream'), 0.5, 'cup', NULL, FALSE, 8, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'kasuri methi'), 1, 'teaspoon', NULL, FALSE, 9, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'honey'), 1, 'teaspoon', NULL, FALSE, 10, NULL),
          ('butter-chicken', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 11, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // jeera-rice: 1 cup basmati, 1.5 cups water, 1 tbsp ghee, 1 tsp cumin seeds, 2 cardamom pods, 1 bay leaf, salt
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'basmati rice'), 1, 'cup', NULL, FALSE, 1, NULL),
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'water'), 1.5, 'cup', NULL, FALSE, 2, NULL),
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'ghee'), 1, 'tablespoon', NULL, FALSE, 3, NULL),
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'cumin seeds'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'cardamom'), 2, NULL, NULL, FALSE, 5, 'pods'),
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'bay leaf'), 1, NULL, NULL, FALSE, 6, NULL),
          ('jeera-rice', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 7, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // aloo-gobi: 2 potatoes (cubed), 1 cauliflower (florets), 1 onion, 1 tsp cumin seeds,
        //   1/2 tsp turmeric, 1 tsp coriander powder, 1/2 tsp cumin powder, 1/2 tsp red chili powder,
        //   2 tbsp oil, cilantro, salt
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'potatoes'), 2, NULL, 'cubed', FALSE, 1, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'cauliflower'), 1, NULL, 'florets', FALSE, 2, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'onion'), 1, NULL, NULL, FALSE, 3, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'cumin seeds'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'turmeric'), 0.5, 'teaspoon', NULL, FALSE, 5, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'coriander powder'), 1, 'teaspoon', NULL, FALSE, 6, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'cumin powder'), 0.5, 'teaspoon', NULL, FALSE, 7, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'red chili powder'), 0.5, 'teaspoon', NULL, FALSE, 8, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'oil'), 2, 'tablespoon', NULL, FALSE, 9, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'cilantro'), NULL, NULL, NULL, FALSE, 10, NULL),
          ('aloo-gobi', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 11, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // naan-bread: 2 cups flour, 1/4 cup yogurt, 1 tsp yeast, 1 tsp sugar, 1/2 tsp salt,
        //   1/2 cup warm water, 2 tbsp melted butter, 1 garlic clove (optional)
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'flour'), 2, 'cup', NULL, FALSE, 1, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'yogurt'), 0.25, 'cup', NULL, FALSE, 2, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'yeast'), 1, 'teaspoon', NULL, FALSE, 3, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'sugar'), 1, 'teaspoon', NULL, FALSE, 4, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'salt'), 0.5, 'teaspoon', NULL, FALSE, 5, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'warm water'), 0.5, 'cup', NULL, FALSE, 6, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'butter'), 2, 'tablespoon', 'melted', FALSE, 7, NULL),
          ('naan-bread', (SELECT id FROM ingredients WHERE name = 'garlic'), 1, 'clove', NULL, TRUE, 8, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // chana-masala: 2 cans chickpeas, 2 onions, 1 cup tomato puree, 1 tbsp ginger-garlic paste,
        //   1 tsp cumin seeds, 1 tsp coriander powder, 1 tsp garam masala, 1/2 tsp amchur powder,
        //   1 bay leaf, 1 cinnamon stick, cilantro, lemon, salt
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'chickpeas'), 2, 'can', NULL, FALSE, 1, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'onion'), 2, NULL, NULL, FALSE, 2, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'tomato puree'), 1, 'cup', NULL, FALSE, 3, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'ginger-garlic paste'), 1, 'tablespoon', NULL, FALSE, 4, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'cumin seeds'), 1, 'teaspoon', NULL, FALSE, 5, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'coriander powder'), 1, 'teaspoon', NULL, FALSE, 6, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'garam masala'), 1, 'teaspoon', NULL, FALSE, 7, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'amchur powder'), 0.5, 'teaspoon', NULL, FALSE, 8, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'bay leaf'), 1, NULL, NULL, FALSE, 9, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'cinnamon'), 1, NULL, NULL, FALSE, 10, 'stick'),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'cilantro'), NULL, NULL, NULL, FALSE, 11, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'lemon'), NULL, NULL, NULL, FALSE, 12, NULL),
          ('chana-masala', (SELECT id FROM ingredients WHERE name = 'salt'), NULL, NULL, NULL, FALSE, 13, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)

        // mango-lassi: 1 cup mango pulp, 1 cup yogurt, 1/2 cup cold milk, 2 tbsp sugar,
        //   1/4 tsp cardamom powder, saffron (optional), ice cubes
        await client.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, preparation, optional, sort_order, notes) VALUES
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'mango pulp'), 1, 'cup', NULL, FALSE, 1, NULL),
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'yogurt'), 1, 'cup', NULL, FALSE, 2, 'thick'),
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'milk'), 0.5, 'cup', NULL, FALSE, 3, 'cold'),
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'sugar'), 2, 'tablespoon', NULL, FALSE, 4, NULL),
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'cardamom powder'), 0.25, 'teaspoon', NULL, FALSE, 5, NULL),
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'saffron'), NULL, NULL, NULL, TRUE, 6, 'strands'),
          ('mango-lassi', (SELECT id FROM ingredients WHERE name = 'ice cubes'), NULL, NULL, NULL, FALSE, 7, NULL)
          ON CONFLICT (recipe_id, ingredient_id) DO NOTHING
        `)
      })
      await this.recordMigration('009_seed_ingredients')
      logger.info('Ingredient seed data migration applied')
    }

    // User favorites table (migration 010)
    const favoritesApplied = await this.isMigrationApplied('010_user_favorites')
    if (!favoritesApplied) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_favorites (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
          added_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, recipe_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe ON user_favorites(recipe_id);
      `)
      await this.recordMigration('010_user_favorites')
      logger.info('User favorites migration applied')
    }

    // Social tables: user_follows + user_posts (migration 011)
    const socialApplied = await this.isMigrationApplied('011_social_tables')
    if (!socialApplied) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_follows (
          id SERIAL PRIMARY KEY,
          follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(follower_id, following_id),
          CHECK (follower_id != following_id)
        );
        CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
        CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

        CREATE TABLE IF NOT EXISTS user_posts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          post_type TEXT CHECK (post_type IN ('recipe_completed', 'photo_upload', 'milestone')) NOT NULL,
          recipe_id TEXT REFERENCES recipes(id) ON DELETE SET NULL,
          photo_url TEXT,
          caption TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_user_posts_user ON user_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_posts_created ON user_posts(created_at DESC);

        ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;
      `)
      await this.recordMigration('011_social_tables')
      logger.info('Social tables migration applied')
    }

    // Alpha access: is_allowed + is_admin columns (migration 012)
    const alphaApplied = await this.isMigrationApplied('012_alpha_access')
    if (!alphaApplied) {
      await this.pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_allowed BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
        UPDATE users SET is_allowed = TRUE, is_admin = TRUE WHERE email = 'admin@cookquest.dev';
      `)
      await this.recordMigration('012_alpha_access')
      logger.info('Alpha access migration applied')
    }

    // Post comments table (migration 013)
    const commentsApplied = await this.isMigrationApplied('013_post_comments')
    if (!commentsApplied) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS post_comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
        CREATE INDEX IF NOT EXISTS idx_post_comments_created ON post_comments(created_at ASC);
        ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
      `)
      await this.recordMigration('013_post_comments')
      logger.info('Post comments migration applied')
    }

    // Seed community users with posts, progress & mutual follows (migration 014)
    const seedUsersApplied = await this.isMigrationApplied('014_seed_community_users')
    if (!seedUsersApplied) {
      // Insert 3 seed users (ON CONFLICT ensures idempotency)
      await this.pool.query(`
        INSERT INTO users (email, username, password_hash, display_name, is_active, email_verified, is_allowed, created_at)
        VALUES
          ('maya@cookquest.dev', 'maya-chen', '$2a$12$qIU65SWepwAu8JXaH8EJ6uu/Z6WvD7hmeHkO9BCWr6D1ob0wNSZKm', 'Maya Chen', TRUE, TRUE, TRUE, NOW() - INTERVAL '14 days'),
          ('jake@cookquest.dev', 'jake-morrison', '$2a$12$zwKgxJBheNF58O7JzOEkvOun0Sh2nOlhzlwOjKGTw08bnR5M9pyK.', 'Jake Morrison', TRUE, TRUE, TRUE, NOW() - INTERVAL '12 days'),
          ('sophia@cookquest.dev', 'sophia-rodriguez', '$2a$12$nPrdcex/t84E0oUcr4jgkOQMXk4PhLyXgeBZpIYfNEuvihMVfmsyK', 'Sophia Rodriguez', TRUE, TRUE, TRUE, NOW() - INTERVAL '13 days')
        ON CONFLICT (email) DO NOTHING;
      `)

      // Maya's recipe progress (basic-cooking + indian-cuisine)
      await this.pool.query(`
        INSERT INTO user_recipe_progress (user_id, recipe_id, status, completed_at, attempts)
        VALUES
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'boiled-egg', 'completed', NOW() - INTERVAL '13 days', 2),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'make-rice', 'completed', NOW() - INTERVAL '12 days', 1),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'chop-onion', 'completed', NOW() - INTERVAL '11 days', 1),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'dal-tadka', 'completed', NOW() - INTERVAL '8 days', 2),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'butter-chicken', 'completed', NOW() - INTERVAL '5 days', 3),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'jeera-rice', 'completed', NOW() - INTERVAL '2 days', 1)
        ON CONFLICT (user_id, recipe_id) DO NOTHING;
      `)

      // Jake's recipe progress (basic-cooking + heat-control + air-fryer)
      await this.pool.query(`
        INSERT INTO user_recipe_progress (user_id, recipe_id, status, completed_at, attempts)
        VALUES
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'boiled-egg', 'completed', NOW() - INTERVAL '11 days', 1),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'make-rice', 'completed', NOW() - INTERVAL '10 days', 2),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'sear-steak', 'completed', NOW() - INTERVAL '8 days', 3),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'stir-fry', 'completed', NOW() - INTERVAL '5 days', 2),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'air-fryer-fries', 'completed', NOW() - INTERVAL '3 days', 1),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'air-fryer-chicken-wings', 'completed', NOW() - INTERVAL '1 day', 2)
        ON CONFLICT (user_id, recipe_id) DO NOTHING;
      `)

      // Sophia's recipe progress (basic-cooking + flavor-building)
      await this.pool.query(`
        INSERT INTO user_recipe_progress (user_id, recipe_id, status, completed_at, attempts)
        VALUES
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'boiled-egg', 'completed', NOW() - INTERVAL '12 days', 1),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'chop-onion', 'completed', NOW() - INTERVAL '11 days', 1),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'make-rice', 'completed', NOW() - INTERVAL '10 days', 1),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'make-sauce', 'completed', NOW() - INTERVAL '8 days', 2),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'season-taste', 'completed', NOW() - INTERVAL '6 days', 1),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'herb-pairing', 'completed', NOW() - INTERVAL '4 days', 2),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'spice-blend', 'completed', NOW() - INTERVAL '2 days', 1)
        ON CONFLICT (user_id, recipe_id) DO NOTHING;
      `)

      // Skill progress for all 3 users
      await this.pool.query(`
        INSERT INTO user_skill_progress (user_id, skill_id, completed_recipes, total_recipes, mastery_level)
        VALUES
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'basic-cooking', 3, 3, 'proficient'),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'indian-cuisine', 3, 7, 'developing'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'basic-cooking', 2, 3, 'developing'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'heat-control', 2, 5, 'developing'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'air-fryer', 2, 6, 'developing'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'basic-cooking', 3, 3, 'proficient'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'flavor-building', 4, 8, 'developing')
        ON CONFLICT (user_id, skill_id) DO NOTHING;
      `)

      // Maya's posts (4 posts)
      await this.pool.query(`
        INSERT INTO user_posts (user_id, post_type, recipe_id, caption, created_at)
        VALUES
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'recipe_completed', 'boiled-egg', 'Started with the basics — my boiled eggs are now consistently perfect! Small wins matter.', NOW() - INTERVAL '13 days'),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'recipe_completed', 'dal-tadka', 'First time making dal tadka from scratch! The tempering was so satisfying. My kitchen smelled incredible all evening.', NOW() - INTERVAL '8 days'),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'recipe_completed', 'butter-chicken', 'Butter chicken attempt #2 and honestly this is way better than takeout. The secret is patience with the sauce!', NOW() - INTERVAL '5 days'),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), 'recipe_completed', 'jeera-rice', 'Finally nailed the perfect jeera rice. Toasting the cumin seeds first makes all the difference.', NOW() - INTERVAL '2 days')
        ;
      `)

      // Jake's posts (3 posts)
      await this.pool.query(`
        INSERT INTO user_posts (user_id, post_type, recipe_id, caption, created_at)
        VALUES
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'recipe_completed', 'sear-steak', 'Got the perfect sear on my steak! Medium-rare, just how I like it. Cast iron pan is the move.', NOW() - INTERVAL '8 days'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'recipe_completed', 'stir-fry', 'Mastering the wok for stir-fry. High heat is everything — veggies come out crispy not soggy now!', NOW() - INTERVAL '5 days'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), 'recipe_completed', 'air-fryer-chicken-wings', 'Air fryer chicken wings are a game changer. Crispy without the oil and ready in 25 minutes!', NOW() - INTERVAL '1 day')
        ;
      `)

      // Sophia's posts (4 posts)
      await this.pool.query(`
        INSERT INTO user_posts (user_id, post_type, recipe_id, caption, created_at)
        VALUES
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'recipe_completed', 'make-sauce', 'Made my first sauce from scratch — a rich tomato basil that simmered for hours. Never going back to jarred!', NOW() - INTERVAL '8 days'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'recipe_completed', 'season-taste', 'Learning to season by taste instead of just following measurements. Total game changer for my cooking confidence.', NOW() - INTERVAL '6 days'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'recipe_completed', 'herb-pairing', 'Herb pairing experiment: basil + thyme in a roasted veggie dish. The flavors just sing together!', NOW() - INTERVAL '4 days'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), 'recipe_completed', 'spice-blend', 'Custom spice blend day! Made a smoky paprika mix that I have been putting on literally everything.', NOW() - INTERVAL '2 days')
        ;
      `)

      // Mutual follows — all 3 users follow each other (6 rows)
      await this.pool.query(`
        INSERT INTO user_follows (follower_id, following_id, created_at)
        VALUES
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), (SELECT id FROM users WHERE email='jake@cookquest.dev'), NOW() - INTERVAL '10 days'),
          ((SELECT id FROM users WHERE email='maya@cookquest.dev'), (SELECT id FROM users WHERE email='sophia@cookquest.dev'), NOW() - INTERVAL '10 days'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), (SELECT id FROM users WHERE email='maya@cookquest.dev'), NOW() - INTERVAL '9 days'),
          ((SELECT id FROM users WHERE email='jake@cookquest.dev'), (SELECT id FROM users WHERE email='sophia@cookquest.dev'), NOW() - INTERVAL '9 days'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), (SELECT id FROM users WHERE email='maya@cookquest.dev'), NOW() - INTERVAL '11 days'),
          ((SELECT id FROM users WHERE email='sophia@cookquest.dev'), (SELECT id FROM users WHERE email='jake@cookquest.dev'), NOW() - INTERVAL '11 days')
        ON CONFLICT (follower_id, following_id) DO NOTHING;
      `)

      // Update follower/following counts
      await this.pool.query(`
        UPDATE users SET followers_count = 2, following_count = 2
        WHERE email IN ('maya@cookquest.dev', 'jake@cookquest.dev', 'sophia@cookquest.dev');
      `)

      await this.recordMigration('014_seed_community_users')
      logger.info('Seeded 3 community users with posts, progress & mutual follows')
    }

    // Comment likes table (migration 015)
    if (!(await this.isMigrationApplied('015_comment_likes'))) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS comment_likes (
          id SERIAL PRIMARY KEY,
          comment_id INTEGER NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(comment_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);
        ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
      `)
      await this.recordMigration('015_comment_likes')
      logger.info('Comment likes migration applied')
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
      'SELECT id, email, username, password_hash, preferences as profile, created_at, updated_at, is_allowed, is_admin FROM users WHERE id = $1',
      [id]
    )
    if (!rows[0]) return null
    return this._mapUser(rows[0])
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT id, email, username, password_hash, preferences as profile, created_at, updated_at, is_allowed, is_admin FROM users WHERE email = $1',
      [email]
    )
    if (!rows[0]) return null
    return this._mapUser(rows[0])
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { rows } = await this.pool.query(
      'SELECT id, email, username, password_hash, preferences as profile, created_at, updated_at, is_allowed, is_admin FROM users WHERE username = $1',
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
      is_allowed: row.is_allowed ?? false,
      is_admin: row.is_admin ?? false,
    }
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    const { rows } = await this.pool.query(
      'SELECT id, email, username, is_allowed, is_admin, created_at FROM users ORDER BY created_at DESC'
    )
    return rows.map((row: any) => ({
      ...row,
      is_allowed: row.is_allowed ?? false,
      is_admin: row.is_admin ?? false,
    }))
  }

  async setUserAllowed(userId: number, isAllowed: boolean): Promise<void> {
    await this.pool.query('UPDATE users SET is_allowed = $1 WHERE id = $2', [isAllowed, userId])
  }

  async setUserAdmin(userId: number, isAdmin: boolean): Promise<void> {
    await this.pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin, userId])
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
    const recipe = this._mapRecipe(rows[0])
    const structuredIngredients = await this.getIngredientsByRecipeId(id)
    return { ...recipe, structured_ingredients: structuredIngredients }
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

  // Ingredient methods
  async getIngredientsByRecipeId(recipeId: string): Promise<StructuredIngredient[]> {
    const { rows } = await this.pool.query(
      `SELECT i.id, i.name, i.category,
              ri.amount, ri.unit, ri.preparation,
              ri.optional, ri.sort_order, ri.notes
       FROM recipe_ingredients ri
       JOIN ingredients i ON i.id = ri.ingredient_id
       WHERE ri.recipe_id = $1
       ORDER BY ri.sort_order`,
      [recipeId]
    )
    return rows
  }

  async getAllIngredients(): Promise<Ingredient[]> {
    const { rows } = await this.pool.query(
      'SELECT id, name, category, created_at FROM ingredients ORDER BY name'
    )
    return rows
  }

  async searchIngredients(query: string): Promise<Ingredient[]> {
    const { rows } = await this.pool.query(
      `SELECT id, name, category FROM ingredients
       WHERE name ILIKE $1
       ORDER BY name LIMIT 20`,
      [`%${query}%`]
    )
    return rows
  }

  async getRecipesByIngredientId(ingredientId: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT r.id, r.title, r.skill_id AS skill, r.emoji,
              ri.amount, ri.unit
       FROM recipe_ingredients ri
       JOIN recipes r ON r.id = ri.recipe_id
       WHERE ri.ingredient_id = $1 AND r.is_active = TRUE
       ORDER BY r.title`,
      [ingredientId]
    )
    return rows
  }

  async getIngredientsByCategory(category: string): Promise<Ingredient[]> {
    const { rows } = await this.pool.query(
      `SELECT id, name, category FROM ingredients
       WHERE category = $1
       ORDER BY name`,
      [category]
    )
    return rows
  }

  async getIngredientById(id: number): Promise<Ingredient | null> {
    const { rows } = await this.pool.query(
      'SELECT id, name, category, created_at FROM ingredients WHERE id = $1',
      [id]
    )
    return rows[0] || null
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

  // Skill unlock methods

  /**
   * Get skills that should be unlocked for a user based on their progress.
   * A skill is unlocked when the user has completed >= required_recipes_completed
   * recipes in the required_skill_id skill.
   */
  async getUnlockedSkillsForUser(userId: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT s.*
       FROM skills s
       WHERE s.is_active = TRUE
         AND (
           s.required_skill_id IS NULL
           OR (
             SELECT COUNT(*) FROM user_recipe_progress urp
             JOIN recipes r ON r.id = urp.recipe_id
             WHERE urp.user_id = $1
               AND r.skill_id = s.required_skill_id
               AND urp.status IN ('completed', 'mastered')
           ) >= s.required_recipes_completed
         )
       ORDER BY s.sort_order`,
      [userId]
    )
    return rows
  }

  /**
   * After a recipe completion, check if any new skills have been NEWLY unlocked.
   * Uses exact threshold match (=) so it only fires on the completion that crosses
   * the threshold, not on subsequent completions in the same skill.
   */
  async getNewlyUnlockedSkills(userId: number, completedSkillId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT s.id, s.name, s.description, s.icon, s.color, s.sort_order
       FROM skills s
       WHERE s.is_active = TRUE
         AND s.required_skill_id = $2
         AND s.required_recipes_completed = (
           SELECT COUNT(*) FROM user_recipe_progress urp
           JOIN recipes r ON r.id = urp.recipe_id
           WHERE urp.user_id = $1
             AND r.skill_id = $2
             AND urp.status IN ('completed', 'mastered')
         )
       ORDER BY s.sort_order`,
      [userId, completedSkillId]
    )
    return rows
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
  async getUserRecipePhotos(userId: number): Promise<{ recipe_id: string; photo_url: string; storage_key: string | null; uploaded_at: string }[]> {
    const { rows } = await this.pool.query(
      'SELECT recipe_id, photo_url, storage_key, uploaded_at FROM user_recipe_photos WHERE user_id = $1 ORDER BY uploaded_at DESC',
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

  // ── Favorites ──

  async addFavorite(userId: number, recipeId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_favorites (user_id, recipe_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, recipe_id) DO NOTHING`,
      [userId, recipeId]
    )
  }

  async removeFavorite(userId: number, recipeId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    )
  }

  async getUserFavorites(userId: number): Promise<Recipe[]> {
    const { rows } = await this.pool.query(
      `SELECT r.*, uf.added_at AS favorited_at
       FROM user_favorites uf
       JOIN recipes r ON r.id = uf.recipe_id
       WHERE uf.user_id = $1
       ORDER BY uf.added_at DESC`,
      [userId]
    )
    return rows.map(r => this._mapRecipe(r))
  }

  async getUserFavoriteIds(userId: number): Promise<Set<string>> {
    const { rows } = await this.pool.query(
      'SELECT recipe_id FROM user_favorites WHERE user_id = $1',
      [userId]
    )
    return new Set(rows.map(r => r.recipe_id))
  }

  // ── Social: Follows ──

  async followUser(followerId: number, followingId: number): Promise<void> {
    await this.transaction(async (client) => {
      await client.query(
        `INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)`,
        [followerId, followingId]
      )
      await client.query(
        'UPDATE users SET following_count = following_count + 1 WHERE id = $1',
        [followerId]
      )
      await client.query(
        'UPDATE users SET followers_count = followers_count + 1 WHERE id = $1',
        [followingId]
      )
    })
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    return this.transaction(async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2',
        [followerId, followingId]
      )
      if (!rowCount) return false
      await client.query(
        'UPDATE users SET following_count = GREATEST(following_count - 1, 0) WHERE id = $1',
        [followerId]
      )
      await client.query(
        'UPDATE users SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = $1',
        [followingId]
      )
      return true
    })
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    )
    return rows.length > 0
  }

  async getFollowers(userId: number, currentUserId?: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              ${currentUserId
                ? `EXISTS(SELECT 1 FROM user_follows WHERE follower_id = ${currentUserId} AND following_id = u.id) AS is_following`
                : 'FALSE AS is_following'}
       FROM user_follows uf
       JOIN users u ON u.id = uf.follower_id
       WHERE uf.following_id = $1
       ORDER BY uf.created_at DESC`,
      [userId]
    )
    return rows
  }

  async getFollowing(userId: number, currentUserId?: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              ${currentUserId
                ? `EXISTS(SELECT 1 FROM user_follows WHERE follower_id = ${currentUserId} AND following_id = u.id) AS is_following`
                : 'FALSE AS is_following'}
       FROM user_follows uf
       JOIN users u ON u.id = uf.following_id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC`,
      [userId]
    )
    return rows
  }

  async searchUsers(query: string, currentUserId?: number, limit: number = 20): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              u.followers_count, u.following_count,
              ${currentUserId
                ? `EXISTS(SELECT 1 FROM user_follows WHERE follower_id = $3 AND following_id = u.id) AS is_following`
                : 'FALSE AS is_following'}
       FROM users u
       WHERE (u.username ILIKE $1 OR u.display_name ILIKE $1)
         AND u.is_active = TRUE
       ORDER BY u.username ASC
       LIMIT $2`,
      currentUserId
        ? [`%${query}%`, limit, currentUserId]
        : [`%${query}%`, limit]
    )
    return rows
  }

  async getPublicProfile(userId: number, currentUserId?: number): Promise<any | null> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.uuid, u.username, u.display_name, u.avatar_url,
              u.followers_count, u.following_count,
              COALESCE((SELECT COUNT(*) FROM user_recipe_progress WHERE user_id = u.id AND status = 'completed')::int, 0) AS total_recipes_completed,
              ${currentUserId
                ? `EXISTS(SELECT 1 FROM user_follows WHERE follower_id = ${currentUserId} AND following_id = u.id) AS is_following`
                : 'FALSE AS is_following'}
       FROM users u
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [userId]
    )
    return rows[0] || null
  }

  // ── Avatar ──

  async updateUserAvatar(userId: number, avatarUrl: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2`,
      [avatarUrl, userId]
    )
  }

  async clearUserAvatar(userId: number): Promise<void> {
    await this.pool.query(
      `UPDATE users SET avatar_url = NULL WHERE id = $1`,
      [userId]
    )
  }

  async getUserAvatarUrl(userId: number): Promise<string | null> {
    const { rows } = await this.pool.query(
      `SELECT avatar_url FROM users WHERE id = $1`,
      [userId]
    )
    return rows[0]?.avatar_url || null
  }

  // ── Social: Posts & Feed ──

  async createPost(userId: number, postType: string, recipeId?: string, photoUrl?: string, caption?: string): Promise<any> {
    const { rows } = await this.pool.query(
      `INSERT INTO user_posts (user_id, post_type, recipe_id, photo_url, caption)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, post_type, recipe_id, photo_url, caption, created_at`,
      [userId, postType, recipeId || null, photoUrl || null, caption || null]
    )
    return rows[0]
  }

  async getWorldFeed(limit: number = 30): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT
        up.id, up.user_id, u.username, u.display_name, u.avatar_url,
        up.post_type, up.recipe_id, r.title AS recipe_title, r.image_url AS recipe_image_url,
        up.photo_url, up.caption, COALESCE(up.comments_count, 0) AS comments_count, up.created_at
       FROM user_posts up
       JOIN users u ON u.id = up.user_id
       LEFT JOIN recipes r ON r.id = up.recipe_id
       ORDER BY up.created_at DESC
       LIMIT $1`,
      [limit]
    )
    return rows
  }

  async getWorldLeaderboard(limit: number = 10): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
         COALESCE((SELECT COUNT(*) FROM user_recipe_progress
           WHERE user_id = u.id AND status = 'completed')::int, 0) AS recipes_completed
       FROM users u
       WHERE u.is_active = TRUE
       ORDER BY recipes_completed DESC, u.created_at ASC
       LIMIT $1`,
      [limit]
    )
    return rows
  }

  async getFriendsLeaderboard(userId: number, limit: number = 10): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
         COALESCE((SELECT COUNT(*) FROM user_recipe_progress
           WHERE user_id = u.id AND status = 'completed')::int, 0) AS recipes_completed
       FROM users u
       WHERE u.is_active = TRUE
         AND (u.id = $1 OR u.id IN (SELECT following_id FROM user_follows WHERE follower_id = $1))
       ORDER BY recipes_completed DESC, u.created_at ASC
       LIMIT $2`,
      [userId, limit]
    )
    return rows
  }

  async getFeed(userId: number, limit: number = 5): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT
        up.id, up.user_id, u.username, u.display_name, u.avatar_url,
        up.post_type, up.recipe_id, r.title AS recipe_title, r.image_url AS recipe_image_url,
        up.photo_url, up.caption, COALESCE(up.comments_count, 0) AS comments_count, up.created_at
       FROM user_posts up
       JOIN user_follows uf ON uf.following_id = up.user_id AND uf.follower_id = $1
       JOIN users u ON u.id = up.user_id
       LEFT JOIN recipes r ON r.id = up.recipe_id
       ORDER BY up.created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return rows
  }

  async getUserPosts(userId: number, limit: number = 10): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT
        up.id, up.user_id, u.username, u.display_name, u.avatar_url,
        up.post_type, up.recipe_id, r.title AS recipe_title, r.image_url AS recipe_image_url,
        up.photo_url, up.caption, COALESCE(up.comments_count, 0) AS comments_count, up.created_at
       FROM user_posts up
       JOIN users u ON u.id = up.user_id
       LEFT JOIN recipes r ON r.id = up.recipe_id
       WHERE up.user_id = $1
       ORDER BY up.created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return rows
  }

  async hasRecipeCompletionPost(userId: number, recipeId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM user_posts WHERE user_id = $1 AND recipe_id = $2 AND post_type = 'recipe_completed' LIMIT 1`,
      [userId, recipeId]
    )
    return rows.length > 0
  }

  async hasPhotoUploadPost(userId: number, recipeId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM user_posts WHERE user_id = $1 AND recipe_id = $2 AND post_type = 'photo_upload' LIMIT 1`,
      [userId, recipeId]
    )
    return rows.length > 0
  }

  async deletePost(postId: number, userId: number): Promise<'deleted' | 'forbidden' | 'not_found'> {
    return this.transaction(async (client) => {
      const { rows } = await client.query(
        'SELECT id, user_id FROM user_posts WHERE id = $1',
        [postId]
      )
      if (rows.length === 0) return 'not_found'
      if (rows[0].user_id !== userId) return 'forbidden'
      // Comments are CASCADE-deleted via FK on post_comments
      await client.query('DELETE FROM user_posts WHERE id = $1', [postId])
      return 'deleted'
    })
  }

  // ── Social: Comments ──

  async getPostById(postId: number): Promise<any | null> {
    const { rows } = await this.pool.query(
      'SELECT id, user_id FROM user_posts WHERE id = $1',
      [postId]
    )
    return rows[0] || null
  }

  async addComment(postId: number, userId: number, content: string): Promise<any> {
    return this.transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO post_comments (post_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING id, post_id, user_id, content, created_at`,
        [postId, userId, content]
      )
      await client.query(
        'UPDATE user_posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = $1',
        [postId]
      )
      // Fetch user info for the response
      const { rows: userRows } = await client.query(
        'SELECT username, display_name, avatar_url FROM users WHERE id = $1',
        [userId]
      )
      const comment = rows[0]
      const user = userRows[0]
      return {
        ...comment,
        username: user.username,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      }
    })
  }

  async deleteComment(commentId: number, userId: number): Promise<boolean> {
    return this.transaction(async (client) => {
      const { rows } = await client.query(
        'SELECT id, post_id, user_id FROM post_comments WHERE id = $1',
        [commentId]
      )
      if (rows.length === 0) return false
      const comment = rows[0]
      if (comment.user_id !== userId) {
        throw new Error('FORBIDDEN')
      }
      await client.query('DELETE FROM post_comments WHERE id = $1', [commentId])
      await client.query(
        'UPDATE user_posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = $1',
        [comment.post_id]
      )
      return true
    })
  }

  async getComments(postId: number, limit: number = 50, currentUserId?: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT pc.id, pc.post_id, pc.user_id, u.username, u.display_name, u.avatar_url,
              pc.content, COALESCE(pc.likes_count, 0) AS likes_count,
              EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = pc.id AND cl.user_id = $3) AS is_liked,
              pc.created_at
       FROM post_comments pc
       JOIN users u ON u.id = pc.user_id
       WHERE pc.post_id = $1
       ORDER BY pc.created_at ASC
       LIMIT $2`,
      [postId, limit, currentUserId ?? 0]
    )
    return rows
  }

  async toggleCommentLike(commentId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    return this.transaction(async (client) => {
      const { rows: existing } = await client.query(
        'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
        [commentId, userId]
      )
      if (existing.length > 0) {
        await client.query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId])
        await client.query('UPDATE post_comments SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = $1', [commentId])
      } else {
        await client.query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [commentId, userId])
        await client.query('UPDATE post_comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1', [commentId])
      }
      const { rows } = await client.query('SELECT COALESCE(likes_count, 0) AS likes_count FROM post_comments WHERE id = $1', [commentId])
      return { liked: existing.length === 0, likesCount: rows[0]?.likes_count ?? 0 }
    })
  }

  async getCommentCount(postId: number): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COALESCE(comments_count, 0) AS count FROM user_posts WHERE id = $1',
      [postId]
    )
    return rows[0]?.count ?? 0
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

  // Skill trophies — completion stats per skill for a user
  async getUserSkillTrophies(userId: number): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT r.skill_id,
              COUNT(DISTINCT r.id)::int AS total,
              COUNT(DISTINCT CASE WHEN urp.status = 'completed' THEN r.id END)::int AS completed
       FROM recipes r
       LEFT JOIN user_recipe_progress urp ON urp.recipe_id = r.id AND urp.user_id = $1
       GROUP BY r.skill_id
       ORDER BY r.skill_id`,
      [userId]
    )
    return rows
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
