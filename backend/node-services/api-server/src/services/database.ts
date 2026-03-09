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

    // Post likes + notifications tables (migration 016)
    if (!(await this.isMigrationApplied('016_post_likes_notifications'))) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS post_likes (
          id SERIAL PRIMARY KEY,
          post_id INTEGER NOT NULL REFERENCES user_posts(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(post_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
        CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
        ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          actor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK (type IN ('follow', 'post_like', 'comment', 'comment_like')),
          post_id INTEGER REFERENCES user_posts(id) ON DELETE CASCADE,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id);
      `)
      await this.recordMigration('016_post_likes_notifications')
      logger.info('Post likes + notifications migration applied')
    }

    // Indian cooking plan recipes (migration 017)
    if (!(await this.isMigrationApplied('017_indian_plan_recipes'))) {
      await this.pool.query(`
        INSERT INTO recipes (id, title, description, skill_id, difficulty, total_time, image_url, emoji, ingredients, instructions, tips, xp_reward) VALUES

        ('ic-cutting-onion', 'Kitchen Basics & Cutting Onion',
         'Learn fundamental knife skills by practicing onion cutting techniques — the foundation of Indian cooking',
         'indian-cuisine', 'beginner', '30 minutes',
         'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&fit=crop&q=80', '🔪',
         '["2 onions", "1 tomato", "1 green chilli", "Cutting board", "Sharp chef knife"]',
         '["Hold the knife with a firm grip — pinch the blade where it meets the handle", "Peel 2 onions by cutting off the top and removing the skin", "Cut each onion in half through the root", "Place flat side down and slice into thin half-moon pieces", "Dice one onion: make horizontal cuts, then vertical cuts, then slice across", "Practice chopping 1 tomato into small cubes", "Finely chop 1 green chilli (remove seeds for less heat)"]',
         '["Always curl your fingers inward (claw grip) to protect them", "A sharp knife is safer than a dull one — it requires less force", "Keep the tip of the knife on the board and rock it for efficient chopping", "The root end of the onion holds it together — don''t cut it off until the end"]',
         100),

        ('ic-chai-and-eggs', 'Indian Chai & Boiled Eggs',
         'Master heat control by making aromatic masala chai and perfectly boiled eggs',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&fit=crop&q=80', '☕',
         '["1 cup water", "1 cup milk", "1 tsp tea leaves (Assam or CTC)", "Sugar to taste", "1 inch grated ginger", "2-3 eggs", "Pinch of salt"]',
         '["CHAI: Boil 1 cup water in a saucepan", "Add tea leaves and grated ginger, simmer 1 minute", "Add 1 cup milk and sugar to taste", "Bring to a rolling boil, then simmer 2 minutes", "Strain into cups", "EGGS: Place eggs in a pot and cover with cold water", "Bring to a boil over medium-high heat", "Once boiling, cover and remove from heat — wait 8 minutes for hard boil", "Transfer eggs to cold water bath for 2 minutes, then peel"]',
         '["Use full-fat milk for creamy chai", "Ginger is the soul of Indian chai — use fresh, not powder", "Don''t boil milk too rapidly or it will overflow", "Start eggs in cold water to prevent cracking", "The cold water bath makes peeling much easier"]',
         100),

        ('ic-masala-omelette', 'Indian Masala Omelette',
         'A spiced Indian-style omelette loaded with onions, tomatoes, and green chillies',
         'indian-cuisine', 'beginner', '15 minutes',
         'https://images.unsplash.com/photo-1525184782196-8e2ded604bf7?w=800&fit=crop&q=80', '🍳',
         '["2 eggs", "1 small onion (finely chopped)", "1 tomato (finely chopped)", "1 green chilli (finely chopped)", "2 tbsp fresh cilantro (chopped)", "1/4 tsp turmeric", "1/4 tsp red chilli powder", "Salt to taste", "1 tbsp oil or butter"]',
         '["Crack 2 eggs into a bowl and beat well with a fork", "Add chopped onion, tomato, green chilli, and cilantro", "Season with turmeric, red chilli powder, and salt — mix well", "Heat oil or butter in a non-stick pan on medium heat", "Pour the egg mixture and spread evenly across the pan", "Cook undisturbed for 2-3 minutes until the bottom sets", "Carefully flip and cook the other side for 1-2 minutes", "Serve hot with bread or on its own"]',
         '["Don''t over-beat the eggs — a few stirs is enough", "Medium heat is key — too hot and it burns outside while raw inside", "Add a pinch of garam masala for extra flavor", "Serve immediately — omelettes get rubbery when cold"]',
         100),

        ('ic-plain-rice', 'Perfect Plain Rice',
         'Learn the absorption method for fluffy, separate grains of rice every time',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=800&fit=crop&q=80', '🍚',
         '["1 cup long-grain or basmati rice", "2 cups water", "Pinch of salt", "1 tsp oil or ghee (optional)"]',
         '["Measure 1 cup rice into a bowl", "Wash rice by rubbing gently in water — drain and repeat 3 times until water runs clear", "Add rice and 2 cups water to a heavy-bottomed pot", "Add a pinch of salt and optional oil/ghee", "Bring to a rolling boil on high heat", "Reduce heat to lowest setting, cover with tight-fitting lid", "Cook for 12 minutes without lifting the lid", "Turn off heat and let it rest covered for 5 minutes", "Fluff gently with a fork"]',
         '["Washing removes excess starch for separate grains", "The 1:2 rice-to-water ratio is the golden rule for Indian rice", "Never stir rice while cooking — it makes it sticky", "Don''t lift the lid — steam is doing the cooking", "Resting after cooking lets moisture distribute evenly"]',
         100),

        ('ic-simple-dal', 'Simple Moong Dal',
         'Your first lentil dish — a comforting yellow dal with a simple cumin-garlic tempering',
         'indian-cuisine', 'beginner', '30 minutes',
         'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&fit=crop&q=80', '🍲',
         '["1/2 cup moong dal (or toor dal)", "2 cups water", "1/4 tsp turmeric", "Salt to taste", "1 tbsp oil or ghee", "1 tsp cumin seeds", "3 garlic cloves (sliced)", "1 dried red chilli", "Fresh cilantro for garnish"]',
         '["Wash dal 3-4 times until water runs clear", "Add dal, 2 cups water, turmeric, and salt to a pressure cooker", "Pressure cook for 3 whistles (or simmer in pot for 25 minutes until soft)", "Mash the dal lightly with a spoon — it should be slightly soupy", "TADKA: Heat oil/ghee in a small pan", "Add cumin seeds — wait until they splutter (10 seconds)", "Add sliced garlic and dried red chilli — fry until garlic is golden (30 seconds)", "Pour the hot tadka over the dal — it will sizzle", "Garnish with fresh cilantro and serve with rice"]',
         '["Tadka (tempering) is the heart of this dish — don''t skip it", "Dal thickens as it cools — keep it slightly runny", "If using a regular pot instead of pressure cooker, cook 25-30 minutes", "Ghee gives more authentic flavor than oil", "This is the most common everyday Indian home meal"]',
         100),

        ('ic-aloo-sabzi', 'Aloo Sabzi (Dry Potato Curry)',
         'A simple spiced potato dish — the everyday staple of Indian kitchens',
         'indian-cuisine', 'beginner', '25 minutes',
         'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&fit=crop&q=80', '🥔',
         '["2 medium potatoes", "1 tbsp oil", "1 tsp cumin seeds", "1/4 tsp turmeric", "1/2 tsp red chilli powder", "1/2 tsp coriander powder", "Salt to taste", "Fresh cilantro for garnish"]',
         '["Peel and dice potatoes into 1/2 inch cubes", "Heat oil in a pan on medium heat", "Add cumin seeds — wait until they splutter (10 seconds)", "Add diced potatoes and stir to coat with cumin", "Add turmeric, red chilli powder, coriander powder, and salt", "Mix well so spices coat the potatoes evenly", "Cover with a lid and cook on low heat for 10-12 minutes", "Stir every 3-4 minutes to prevent sticking", "Potatoes are done when fork-tender and lightly golden", "Garnish with fresh cilantro"]',
         '["Cut potatoes into equal sizes so they cook evenly", "Keep the lid on — potatoes cook in their own steam", "Don''t add water — this is a dry sabzi", "A squeeze of lemon at the end brightens the flavor", "Goes perfectly with roti or as part of a rice-dal meal"]',
         100),

        ('ic-first-full-meal', 'First Full Meal: Rice + Dal + Sabzi',
         'Combine everything you have learned this week into your first complete Indian meal',
         'indian-cuisine', 'beginner', '45 minutes',
         'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&fit=crop&q=80', '🍽️',
         '["Ingredients for plain rice (Day 4)", "Ingredients for simple dal (Day 5)", "Ingredients for aloo sabzi (Day 6)", "Lemon wedges for serving", "Papad or pickle (optional sides)"]',
         '["PLAN YOUR TIMING: Start dal first (longest cook time)", "While dal pressure cooks, wash and start the rice", "While rice simmers, prepare and cook aloo sabzi", "Check dal — mash it and prepare the tadka", "ASSEMBLY: Serve rice in the center of a plate or thali", "Place dal in a small bowl alongside", "Add aloo sabzi on the side", "Garnish with lemon wedges, cilantro", "Optional: add papad or pickle for the full experience"]',
         '["Meal timing is the real skill here — work on multiple dishes simultaneously", "Dal takes longest, so always start it first", "Keep rice covered and warm while you finish other dishes", "This is a classic North Indian everyday meal — simple but deeply satisfying", "Congratulations — you cooked a complete Indian meal from scratch!"]',
         150),

        ('ic-roti', 'Homemade Roti (Chapati)',
         'Learn to knead dough and roll Indian flatbread on a hot tawa',
         'indian-cuisine', 'beginner', '40 minutes',
         'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&fit=crop&q=80', '🫓',
         '["1 cup whole wheat flour (atta)", "Pinch of salt", "Warm water (about 1/2 cup)", "Extra flour for dusting", "Ghee or butter for brushing (optional)"]',
         '["Mix atta and salt in a large bowl", "Add warm water gradually, mixing with your hand", "Knead for 5-7 minutes until dough is smooth and soft (like an earlobe)", "Cover with a damp cloth and rest for 10 minutes", "Divide dough into 6-8 small balls", "Dust a ball with flour and roll into a thin circle (about 6 inches)", "Heat a tawa (flat pan) on high heat until very hot", "Place roti on the dry tawa — cook until bubbles form (30 seconds)", "Flip and cook the other side until brown spots appear", "Optional: place directly on flame for 2-3 seconds to puff it up", "Brush with ghee and serve hot"]',
         '["Dough consistency is everything — it should be soft, not sticky or dry", "Add water gradually — you can always add more but can''t take it back", "Resting the dough makes it easier to roll", "Roll evenly in all directions for a round shape", "The tawa must be very hot before you put the roti on", "Practice makes perfect — your first few rotis won''t be round, and that''s OK"]',
         100),

        ('ic-egg-bhurji', 'Egg Bhurji (Indian Scrambled Eggs)',
         'Spiced scrambled eggs with onion, tomato, and turmeric — India''s favorite quick meal',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&fit=crop&q=80', '🥚',
         '["2-3 eggs", "1 onion (finely chopped)", "1 tomato (chopped)", "1 green chilli (chopped)", "1/4 tsp turmeric", "1/4 tsp red chilli powder", "1/4 tsp cumin powder", "Salt to taste", "1 tbsp oil", "Fresh cilantro for garnish"]',
         '["Heat oil in a pan on medium heat", "Add chopped onion and cook until translucent (3-4 minutes)", "Add green chilli and cook 30 seconds", "Add chopped tomato, turmeric, red chilli powder, cumin powder, and salt", "Cook until tomato softens and oil separates (3-4 minutes)", "Crack eggs directly into the pan", "Stir and scramble continuously for 2-3 minutes until eggs are just cooked", "Garnish with cilantro and serve with roti or bread"]',
         '["The onion-tomato-spice base (masala) is what makes this Indian, not just scrambled eggs", "Don''t overcook the eggs — they should be soft and moist", "This is a classic bachelor/hostel meal in India", "Add a pinch of garam masala at the end for extra warmth"]',
         100),

        ('ic-upma', 'Upma (Semolina Breakfast)',
         'A savory South Indian breakfast of tempered semolina with vegetables',
         'indian-cuisine', 'beginner', '25 minutes',
         'https://images.unsplash.com/photo-1630383249896-424e482df921?w=800&fit=crop&q=80', '🥣',
         '["1 cup rava (semolina/sooji)", "1 tsp mustard seeds", "8-10 curry leaves", "1 onion (finely chopped)", "1 green chilli (chopped)", "1 inch ginger (grated)", "2 cups water", "Salt to taste", "2 tbsp oil", "Juice of half a lemon", "Fresh cilantro for garnish"]',
         '["Dry roast rava in a pan on low heat for 3-4 minutes until fragrant (no color change needed)", "Set roasted rava aside", "Heat oil in the same pan on medium heat", "Add mustard seeds — wait until they pop and splutter", "Add curry leaves (careful, they splatter) and green chilli", "Add chopped onion and grated ginger — cook until onion is soft (3-4 minutes)", "Add 2 cups water and salt — bring to a boil", "Reduce heat to low and slowly add roasted rava while stirring continuously", "Stir vigorously to prevent lumps — keep stirring for 2-3 minutes", "Cover and cook on low heat for 3-4 minutes until water is absorbed", "Add lemon juice, garnish with cilantro, serve hot"]',
         '["Dry roasting rava prevents the upma from becoming gluey", "Add rava SLOWLY to boiling water while stirring — this is the key to no lumps", "Mustard seeds should pop before you add anything else", "Curry leaves are the signature flavor — don''t skip them", "Upma tastes best eaten immediately — it hardens as it cools"]',
         100),

        ('ic-masala-base', 'Onion Tomato Masala Base',
         'The universal Indian curry base — master this and you can cook dozens of curries',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&fit=crop&q=80', '🧅',
         '["1 large onion (finely sliced)", "2 tomatoes (pureed or finely chopped)", "1 tbsp ginger-garlic paste (or 1 inch ginger + 3 garlic cloves minced)", "1/2 tsp turmeric", "1 tsp red chilli powder", "1 tsp coriander powder", "Salt to taste", "2 tbsp oil"]',
         '["Heat oil in a heavy-bottomed pan on medium heat", "Add sliced onions and cook, stirring occasionally", "Cook until onions turn deep golden brown (8-10 minutes) — don''t rush this step", "Add ginger-garlic paste and cook 1 minute until raw smell goes", "Add turmeric, red chilli powder, coriander powder, and salt", "Stir spices for 30 seconds until fragrant", "Add tomato puree/chopped tomatoes", "Cook on medium heat until oil separates from the masala (5-7 minutes)", "When you see oil pooling around the edges, the masala is ready", "This base can now be used for any curry — just add your protein or vegetable + water"]',
         '["Browning onions deeply is THE most important step — it gives the curry its rich flavor and color", "Oil separating from the masala means it is properly cooked", "Make a big batch and freeze in portions — it keeps for weeks", "This base is called bhuna masala and is used in most Indian curries", "You can add garam masala at the end for extra warmth"]',
         100),

        ('ic-full-thali', 'Full Indian Thali: Roti + Dal + Curry',
         'Your graduation meal — a complete Indian thali with roti, dal, and chana masala',
         'indian-cuisine', 'beginner', '60 minutes',
         'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=800&fit=crop&q=80', '🏆',
         '["Ingredients for roti (Day 8)", "Ingredients for simple dal (Day 5)", "Ingredients for chana masala (or any sabzi)", "Yogurt/raita", "Lemon wedges", "Pickle (optional)", "Papad (optional)"]',
         '["PLAN YOUR TIMING: Start dal in pressure cooker first", "While dal cooks, prepare roti dough and let it rest", "Start the chana masala or sabzi using your masala base (Day 12)", "Prepare tadka for dal when pressure releases", "Roll and cook rotis last — they are best served hot off the tawa", "ASSEMBLY: Arrange on a round plate or thali", "Place 2-3 rotis on one side", "Dal in a small bowl", "Chana masala/sabzi in another bowl", "Add a spoonful of yogurt, lemon wedge, and pickle", "This is a proper Indian thali — you did it!"]',
         '["A thali is about variety and balance — dal for protein, roti for carbs, sabzi for vegetables", "Always make roti last so they are warm when served", "Indian meals are eaten with your right hand — tear roti, scoop dal/sabzi", "You have completed the 2-week plan! You now know the core techniques of Indian cooking", "Next steps: try more complex curries, experiment with different dals, learn to make paratha"]',
         200)

        ON CONFLICT (id) DO NOTHING;
      `)
      await this.recordMigration('017_indian_plan_recipes')
      logger.info('Indian cooking plan recipes seeded')
    }

    // Indian cooking plan Week 3 recipes (migration 018)
    if (!(await this.isMigrationApplied('018_indian_plan_week3'))) {
      await this.pool.query(`
        INSERT INTO recipes (id, title, description, skill_id, difficulty, total_time, image_url, emoji, ingredients, instructions, tips, xp_reward) VALUES

        ('ic-poha', 'Poha (Flattened Rice Breakfast)',
         'Quick and popular Indian breakfast made from flattened rice with onions, spices, and peanuts',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1644289450169-bc58aa16bacb?w=800&fit=crop&q=80', '🍛',
         '["2 cups thick poha (flattened rice)", "1 medium onion (finely chopped)", "1 small potato (diced small)", "1 green chili (slit)", "10-12 peanuts", "1/2 tsp mustard seeds", "8-10 curry leaves", "1/4 tsp turmeric", "Salt to taste", "2 tbsp oil", "Juice of half a lemon", "Fresh cilantro for garnish"]',
         '["Rinse poha in water briefly and drain — do not soak", "Chop onion, green chili, and dice potatoes small", "Heat oil and add mustard seeds — wait until they splutter", "Add curry leaves and peanuts, fry 30 seconds", "Add chopped onion and diced potato, saute until potato softens (5 min)", "Add turmeric and salt, stir well", "Add drained poha and mix gently until heated through (3-4 min)", "Squeeze lemon juice and garnish with cilantro", "Serve hot"]',
         '["Rinse poha briefly — don''t soak or it becomes mushy", "Medium-thick poha holds its shape better than thin variety", "Lemon juice at the end is essential for authentic taste", "Add peanuts early so they get crispy"]',
         100),

        ('ic-paneer-bhurji', 'Paneer Bhurji (Paneer Scramble)',
         'Scrambled paneer with spices — like a vegetarian egg bhurji with Indian cottage cheese',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1631452180539-96aca7d48617?w=800&fit=crop&q=80', '🧀',
         '["200g fresh paneer (crumbled or grated)", "1 onion (finely chopped)", "2 tomatoes (finely chopped)", "1 green chili (chopped)", "1 tsp cumin seeds", "1 tsp ginger-garlic paste", "1/4 tsp turmeric", "1/2 tsp garam masala", "1/4 cup green peas (optional)", "2 tbsp oil", "Salt to taste", "Fresh coriander for garnish"]',
         '["Grate or crumble fresh paneer into small pieces", "Finely chop onion, tomatoes, and green chili", "Heat oil and add cumin seeds until they splutter", "Add chopped onions and saute until soft (3-4 min)", "Add ginger-garlic paste and turmeric, cook 1 minute", "Add chopped tomatoes, cook until soft and masala thickens (3-4 min)", "Stir in crumbled paneer and peas", "Cook 3-4 minutes, seasoning with salt and garam masala", "Garnish with fresh coriander leaves and serve hot"]',
         '["Fresh paneer works best — avoid store-bought hard paneer", "Don''t overcook paneer or it becomes rubbery", "The tomato masala should be thick before adding paneer", "Serve with roti or as a sandwich filling"]',
         100),

        ('ic-matar-paneer', 'Matar Paneer (Peas with Paneer Curry)',
         'North Indian curry of peas and paneer cubes in a spiced onion-tomato-cashew gravy',
         'indian-cuisine', 'intermediate', '35 minutes',
         'https://images.unsplash.com/photo-1708793873401-e8c6c153b76a?w=800&fit=crop&q=80', '🍛',
         '["200g paneer (cubed)", "1 cup green peas", "2 onions (roughly chopped)", "2 tomatoes (roughly chopped)", "3 garlic cloves", "8-10 cashews", "1 tsp cumin seeds", "1 bay leaf", "1/2 tsp turmeric", "1 tsp red chili powder", "1 tsp garam masala", "1 tsp kasuri methi (dried fenugreek)", "1/2 cup water or cream", "2 tbsp oil", "Salt to taste", "Fresh coriander"]',
         '["Blend sauteed onions, tomatoes, garlic, and cashews into a smooth paste", "In a pan, heat oil and saute cumin seeds and bay leaf", "Add the blended paste and cook 5 minutes until oil separates", "Add turmeric, chili powder, and salt", "Add water or cream for desired gravy consistency", "Stir in green peas and cubed paneer", "Simmer 5-7 minutes until peas are cooked", "Finish with kasuri methi and garam masala", "Garnish with fresh coriander"]',
         '["Cashews make the gravy creamy and rich", "Blend the base very smooth for restaurant-style texture", "Kasuri methi (fenugreek leaves) is the signature flavor", "Paneer should be added last so it stays soft"]',
         100),

        ('ic-veg-pulao', 'Vegetable Pulao (One-pot Rice)',
         'Aromatic one-pot basmati rice dish with mixed vegetables and whole spices',
         'indian-cuisine', 'beginner', '30 minutes',
         'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=800&fit=crop&q=80', '🍚',
         '["1 cup basmati rice", "1 carrot (diced)", "1/4 cup green beans (chopped)", "1/4 cup green peas", "1 onion (sliced)", "1 tsp cumin seeds", "1 bay leaf", "2 cardamom pods", "1 small cinnamon stick", "1 tsp ginger-garlic paste", "2 cups water", "1 tbsp oil or ghee", "Salt to taste"]',
         '["Rinse and soak basmati rice for 20 minutes, then drain", "Chop carrots, beans, and onions", "Heat oil/ghee in a pot, add cumin, bay leaf, cinnamon, cardamom", "Saute sliced onions until translucent (3-4 min)", "Add ginger-garlic paste and chopped veggies, cook 1-2 minutes", "Drain rice and add to pot, stir to coat with spices", "Add 2 cups water and salt, bring to a boil", "Cover and cook on low flame until water is absorbed (15 min)", "Fluff with fork and serve"]',
         '["Soaking rice ensures long, separate grains", "Don''t stir rice while cooking", "Whole spices infuse the rice — remove before eating", "Use ghee for richer flavor"]',
         100),

        ('ic-bhindi-masala', 'Bhindi Masala (Okra Stir-fry)',
         'Dry stir-fried okra with onions, tomatoes, and spices — crispy and flavorful',
         'indian-cuisine', 'beginner', '25 minutes',
         'https://images.unsplash.com/photo-1586981114766-708f09a71e20?w=800&fit=crop&q=80', '🫑',
         '["250g okra (bhindi)", "1 onion (finely chopped)", "1 tomato (diced)", "1 tsp cumin seeds", "1/4 tsp turmeric", "1/2 tsp red chili powder", "1/2 tsp garam masala", "Salt to taste", "2 tbsp oil", "Lemon juice", "Fresh coriander"]',
         '["Trim and slice okra into 1-inch pieces", "Heat oil and add cumin seeds until they splutter", "Add finely chopped onion and saute until soft (3-4 min)", "Add okra, turmeric, and salt", "Fry on medium-high heat, stirring occasionally, until tender and lightly browned (10-12 min)", "Add diced tomato, chili powder, and garam masala", "Cook 2-3 more minutes until tomato softens", "Finish with lemon juice and fresh coriander"]',
         '["Wash and completely dry okra before cutting to reduce sliminess", "Don''t cover the pan — steam makes okra slimy", "Cook on medium-high heat for crispy results", "Add tomato at the end so okra stays crisp"]',
         100),

        ('ic-masoor-dal', 'Masoor Dal Tadka (Red Lentil)',
         'Quick-cooking red lentils finished with a fragrant cumin-garlic oil tempering',
         'indian-cuisine', 'beginner', '25 minutes',
         'https://images.unsplash.com/photo-1668236534990-73c4ed23043c?w=800&fit=crop&q=80', '🍲',
         '["1/2 cup masoor dal (red lentils)", "2 cups water", "1/4 tsp turmeric", "Salt to taste", "1 tbsp ghee or oil", "1 tsp cumin seeds", "3 garlic cloves (chopped)", "1 dried red chili", "Fresh coriander for garnish"]',
         '["Rinse masoor dal and boil with turmeric and salt until soft (10-12 min)", "Mash lightly with a ladle — dal should be slightly soupy", "TADKA: Heat ghee or oil in a small pan", "Add cumin seeds and wait until they splutter", "Add chopped garlic and dried red chili, fry until golden", "Pour the sizzling tadka over the cooked dal", "Simmer everything together for 2 more minutes", "Adjust seasoning and garnish with coriander"]',
         '["Masoor dal cooks fastest of all lentils — no soaking needed", "The tadka should sizzle when poured over the dal", "Use ghee for more authentic flavor", "Dal thickens as it cools — keep it slightly runny"]',
         100),

        ('ic-week3-thali', 'Week 3 Thali (Combined Meal)',
         'Combine this week''s recipes into a balanced Indian thali — rotis, rice, dal, and sabzi',
         'indian-cuisine', 'beginner', '60 minutes',
         'https://images.unsplash.com/photo-1742281257707-0c7f7e5ca9c6?w=800&fit=crop&q=80', '🍽️',
         '["Ingredients for roti (from Day 8)", "Ingredients for plain rice", "Ingredients for masoor dal", "Leftover paneer bhurji or matar paneer", "Leftover bhindi masala", "Fresh salad (cucumber, tomato, onion)", "Lemon wedges"]',
         '["PLAN YOUR TIMING: Start dal first (longest cook time)", "While dal simmers, start rice", "Reheat paneer bhurji or matar paneer from this week", "Reheat bhindi masala", "Make fresh rotis last — they are best served hot", "ASSEMBLY: Place 2-3 rotis on a large plate", "Add a bowl of rice in the center", "Place dal in a small bowl", "Add paneer dish and bhindi on the sides", "Garnish with fresh salad, lemon wedges", "Enjoy your Week 3 thali!"]',
         '["This week you learned paneer, pulao, and new vegetables", "Reheating sabzis is part of real Indian home cooking", "A thali is about variety and balance", "Note how each dish uses skills from this week"]',
         150)

        ON CONFLICT (id) DO NOTHING;
      `)
      await this.recordMigration('018_indian_plan_week3')
      logger.info('Indian cooking plan Week 3 recipes seeded')
    }

    // Indian cooking plan Week 4 recipes (migration 019)
    if (!(await this.isMigrationApplied('019_indian_plan_week4'))) {
      await this.pool.query(`
        INSERT INTO recipes (id, title, description, skill_id, difficulty, total_time, image_url, emoji, ingredients, instructions, tips, xp_reward) VALUES

        ('ic-aloo-paratha', 'Aloo Paratha (Stuffed Flatbread)',
         'Spiced mashed potato stuffed inside whole wheat dough, rolled and cooked with ghee until golden',
         'indian-cuisine', 'intermediate', '45 minutes',
         'https://images.unsplash.com/photo-1668357530437-72a12c660f94?w=800&fit=crop&q=80', '🫓',
         '["1 cup whole wheat flour (atta)", "Warm water for dough", "Pinch of salt", "2 potatoes (boiled and mashed)", "1/2 tsp cumin powder", "1/2 tsp coriander powder", "1/4 tsp red chili powder", "Fresh cilantro (chopped)", "Salt to taste", "Ghee for cooking"]',
         '["Knead whole wheat dough with water and salt until soft — rest 10 minutes", "Boil and mash 2 potatoes, mix with cumin, coriander, chili, salt, and cilantro", "Divide dough and filling into equal balls", "Roll each dough ball into a small circle", "Place a potato portion in the center, seal edges, and flatten", "Roll gently into a flat circle (don''t press too hard or filling leaks)", "Cook on a hot griddle, applying ghee on both sides", "Cook until both sides have golden-brown spots", "Serve hot with yogurt or pickle"]',
         '["Dough should be softer than roti dough for easier stuffing", "Don''t overstuff or it will tear while rolling", "Use dry flour for dusting to prevent sticking", "Press gently while rolling — the filling spreads on its own"]',
         100),

        ('ic-paneer-tikka', 'Paneer Tikka (Grilled Paneer)',
         'Yogurt-marinated paneer cubes and vegetables, grilled or pan-fried until charred',
         'indian-cuisine', 'intermediate', '35 minutes',
         'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800&fit=crop&q=80', '🍢',
         '["250g paneer (cubed large)", "1 bell pepper (large pieces)", "1 onion (large pieces)", "1/2 cup thick yogurt", "1 tsp red chili powder", "1/4 tsp turmeric", "1 tsp garam masala", "1 tbsp ginger-garlic paste", "1 tbsp oil", "Salt to taste", "Lemon wedges", "Mint chutney for serving"]',
         '["Cube paneer and chop bell peppers and onions into large pieces", "In a bowl, mix yogurt with chili powder, turmeric, garam masala, ginger-garlic paste, oil, and salt", "Toss paneer and vegetables in the marinade", "Refrigerate for 15-30 minutes", "Thread onto skewers or arrange on a baking tray", "Grill, broil, or pan-cook, turning occasionally", "Cook until lightly charred on all sides (8-10 min)", "Serve with lemon wedges and mint chutney"]',
         '["Thick yogurt clings better — strain if too thin", "Don''t marinate too long or paneer gets mushy", "High heat is key for those charred spots", "A cast iron pan works great if you don''t have a grill"]',
         100),

        ('ic-gajar-matar', 'Gajar Matar Sabzi (Carrot-Pea Curry)',
         'Simple dry curry of diced carrots and peas — quick, nutritious, everyday sabzi',
         'indian-cuisine', 'beginner', '20 minutes',
         'https://images.unsplash.com/photo-1595959524165-0d395008e55b?w=800&fit=crop&q=80', '🥕',
         '["2 carrots (diced)", "1/2 cup green peas", "1 tsp cumin seeds", "1 inch ginger (grated)", "1/4 tsp turmeric", "Salt to taste", "1/2 tsp garam masala or kasuri methi", "1 tbsp oil", "Fresh cilantro"]',
         '["Dice carrots into small cubes", "Heat oil and saute cumin seeds and grated ginger", "Add carrots, peas, turmeric, and salt — stir well", "Cover and cook until carrots are tender (5-7 min), stirring occasionally", "Sprinkle garam masala or kasuri methi and mix", "Serve garnished with cilantro"]',
         '["Cut carrots small so they cook at the same speed as peas", "Keep the lid on to steam the vegetables", "Add a pinch of sugar to enhance the natural sweetness", "This is a great side dish for any roti or rice meal"]',
         100),

        ('ic-rajma-masala', 'Rajma Masala (Kidney Bean Curry)',
         'Hearty Punjabi-style red kidney bean curry in a thick onion-tomato gravy',
         'indian-cuisine', 'intermediate', '50 minutes',
         'https://images.unsplash.com/photo-1697155406121-85aac6236000?w=800&fit=crop&q=80', '🫘',
         '["1/2 cup dried rajma (kidney beans) — soaked overnight", "1 onion (finely chopped)", "1 tomato (chopped)", "1 tbsp ginger-garlic paste", "1 tsp cumin seeds", "1/2 tsp turmeric", "1 tsp coriander powder", "1/2 tsp red chili powder", "1 tsp garam masala", "2 tbsp oil", "Salt to taste", "Cream (optional)", "Fresh cilantro"]',
         '["Soak rajma overnight or 1 hour in hot water", "Pressure cook or boil until very soft", "Heat oil and add cumin seeds until they splutter", "Saute chopped onions until golden (5-6 min)", "Add ginger-garlic paste, cook 1 minute", "Add chopped tomato, turmeric, coriander, chili powder", "Cook until tomato breaks down and oil separates", "Add cooked rajma with some cooking water", "Simmer 10-15 minutes until gravy thickens", "Finish with garam masala and optional cream", "Garnish with cilantro, serve with rice or roti"]',
         '["Rajma MUST be fully cooked — undercooked kidney beans are toxic", "Soaking overnight gives the best texture", "The gravy should be thick and cling to the beans", "Rajma Chawal (with rice) is the ultimate North Indian comfort food"]',
         100),

        ('ic-kadhi', 'Kadhi (Yogurt-Gram Flour Curry)',
         'Tangy yogurt-based curry thickened with gram flour (besan) and tempered with spices',
         'indian-cuisine', 'intermediate', '30 minutes',
         'https://images.unsplash.com/photo-1609915436989-c7a0a4be04ae?w=800&fit=crop&q=80', '🥣',
         '["1 cup yogurt", "3 tbsp gram flour (besan)", "1/4 tsp turmeric", "1/2 tsp red chili powder", "Salt to taste", "2 cups water", "1 tbsp oil", "1/2 tsp mustard seeds", "1/2 tsp cumin seeds", "1/4 tsp fenugreek seeds", "8-10 curry leaves", "2 dried red chilies", "Fresh cilantro"]',
         '["Whisk yogurt with gram flour, turmeric, chili powder, salt, and 2 cups water until lump-free", "Heat oil in a pan, add mustard seeds, cumin, and fenugreek seeds", "When they crackle, add curry leaves and dried red chilies", "Pour in the yogurt mixture, stirring constantly to prevent lumps", "Bring to a gentle simmer on low heat", "Keep stirring occasionally, simmer until kadhi thickens (15-20 min)", "Garnish with cilantro", "Serve with steamed rice or roti"]',
         '["Whisk the yogurt mixture very well — lumps are the enemy", "Stir constantly when heating to prevent curdling", "Low heat is essential — high heat will split the yogurt", "Add pakoras (onion fritters) for authentic kadhi pakora"]',
         100),

        ('ic-khichdi', 'Khichdi (Rice-Dal Comfort Food)',
         'One-pot rice and moong dal cooked together — India''s ultimate comfort food',
         'indian-cuisine', 'beginner', '30 minutes',
         'https://images.unsplash.com/photo-1630409351211-d62ab2d24da4?w=800&fit=crop&q=80', '🍲',
         '["1/2 cup rice", "1/2 cup moong dal", "3 cups water", "1/4 tsp turmeric", "Salt to taste", "1 tbsp ghee", "1 tsp cumin seeds", "Chopped vegetables (carrot, peas, potato — optional)"]',
         '["Rinse rice and moong dal together 3-4 times", "In a pot, heat ghee and add cumin seeds", "If using vegetables, add them and stir 1-2 minutes", "Add rice, dal, turmeric, salt, and 3 cups water", "Cover and cook on medium-low heat", "Stir occasionally until mixture is mushy and porridge-like (15-20 min)", "Adjust consistency — add water if too thick", "Top with a ghee and cumin tadka if desired", "Serve warm"]',
         '["Khichdi should be soft and porridge-like, not separate grains", "The 1:1 rice-to-dal ratio is traditional", "Ghee on top makes it special", "This is what Indian grandmothers make when you are sick"]',
         100),

        ('ic-week4-thali', 'Week 4 Thali (Combined Meal)',
         'A complete North Indian thali featuring rajma, kadhi, rice, roti, and raita',
         'indian-cuisine', 'beginner', '60 minutes',
         'https://images.unsplash.com/photo-1680993032090-1ef7ea9b51e5?w=800&fit=crop&q=80', '🍽️',
         '["Ingredients for jeera rice or plain rice", "Ingredients for rajma masala (or reheat)", "Ingredients for kadhi (or reheat)", "Ingredients for gajar matar (or reheat)", "Fresh rotis or leftover parathas", "Yogurt raita", "Fresh salad"]',
         '["PLAN: Start rajma first if cooking fresh (longest cook time)", "Prepare rice while rajma simmers", "Reheat kadhi and gajar matar", "Make fresh rotis or warm leftover parathas", "Prepare a simple cucumber raita: yogurt + salt + cumin + mint", "ASSEMBLY: Plate jeera rice or plain rice", "Add rajma curry and kadhi in small bowls", "Place gajar matar sabzi on the side", "Stack 2-3 rotis or parathas", "Add raita and fresh salad", "This is a complete North Indian meal!"]',
         '["This week you mastered stuffed breads, marination, and yogurt curries", "Rajma chawal is a Sunday staple in North Indian homes", "Mix and match dishes — that is the beauty of a thali", "Enjoy the rich curry and comfort of your complete meal"]',
         150)

        ON CONFLICT (id) DO NOTHING;
      `)
      await this.recordMigration('019_indian_plan_week4')
      logger.info('Indian cooking plan Week 4 recipes seeded')
    }

    // Indian cooking plan Week 5 recipes (migration 020)
    if (!(await this.isMigrationApplied('020_indian_plan_week5'))) {
      await this.pool.query(`
        INSERT INTO recipes (id, title, description, skill_id, difficulty, total_time, image_url, emoji, ingredients, instructions, tips, xp_reward) VALUES

        ('ic-puri-bhaji', 'Puri Bhaji (Fried Bread & Potato Curry)',
         'Crispy deep-fried puris served with a mildly spiced potato curry — classic Indian breakfast',
         'indian-cuisine', 'intermediate', '40 minutes',
         'https://images.unsplash.com/photo-1605719161691-5d9771fc144f?w=800&fit=crop&q=80', '🫓',
         '["FOR PURI: 1 cup wheat flour", "Water", "Pinch of salt", "Oil for deep frying", "FOR BHAJI: 2 potatoes (boiled, lightly mashed)", "1 onion (chopped)", "1/2 tsp mustard seeds", "1/2 tsp cumin seeds", "1 inch ginger (grated)", "1 green chili (chopped)", "1/4 tsp turmeric", "1/2 tsp red chili powder", "Salt to taste", "2 tbsp oil", "Lemon wedges"]',
         '["PURI DOUGH: Knead a tight dough with flour, water, and salt — rest 10 min", "BHAJI: Boil and lightly mash 2 potatoes", "Heat oil, temper mustard and cumin seeds", "Saute onion, ginger, and green chili until soft", "Add turmeric, chili powder, and mashed potatoes", "Sprinkle water and cook until spiced through (5 min)", "FRYING PURIS: Divide dough into small balls", "Roll each into a thin circle (no oil on surface)", "Heat oil for deep frying until very hot", "Slide puri in — it should puff up within seconds", "Flip once, fry until golden on both sides", "Serve puris hot with potato bhaji and lemon"]',
         '["The dough should be tight (less water than roti dough)", "Oil must be very hot for puris to puff", "Don''t press the puri down while frying — let it puff naturally", "Fry one at a time for best results"]',
         100),

        ('ic-besan-chilla', 'Besan Chilla (Savory Chickpea Pancake)',
         'Savory chickpea-flour pancake like an eggless omelette — quick and protein-rich',
         'indian-cuisine', 'beginner', '15 minutes',
         'https://images.unsplash.com/photo-1601387434127-20979856e76e?w=800&fit=crop&q=80', '🥞',
         '["1 cup chickpea flour (besan)", "Water (about 3/4 cup)", "1 small onion (finely chopped)", "1 tomato (finely chopped)", "2 tbsp fresh coriander (chopped)", "1/4 tsp turmeric", "1/2 tsp red chili powder", "1/2 tsp cumin seeds", "Salt to taste", "Oil for cooking"]',
         '["Mix chickpea flour with water to make a smooth, pourable batter", "Add chopped onion, tomato, coriander, and all spices", "Mix well and let batter rest 5 minutes", "Heat a non-stick pan with a little oil on medium heat", "Pour a ladle of batter and spread thin in a circular motion", "Cook until bottom sets and edges crisp (2-3 min)", "Flip carefully and cook other side until golden", "Serve hot with green chutney or ketchup"]',
         '["Batter should be like crepe batter — pourable but not watery", "Spread quickly before it sets", "Medium heat gives the best color without burning", "This is a great high-protein breakfast alternative to eggs"]',
         100),

        ('ic-paneer-butter-masala', 'Paneer Butter Masala',
         'Rich creamy paneer in a smooth onion-tomato-cashew gravy with butter and cream — restaurant favorite',
         'indian-cuisine', 'intermediate', '40 minutes',
         'https://images.unsplash.com/photo-1680529667594-db0955e6e1f9?w=800&fit=crop&q=80', '🍛',
         '["250g paneer (cubed)", "2 onions (roughly chopped)", "3 tomatoes (roughly chopped)", "3 garlic cloves", "10 cashews", "2 tbsp butter", "1 bay leaf", "2 cardamom pods", "1 tsp cumin seeds", "1/4 cup cream", "1/2 tsp red chili powder", "1 tsp garam masala", "1 tsp kasuri methi", "Salt to taste"]',
         '["Blend sauteed onions, tomatoes, garlic, and cashews into a smooth paste", "In a pan, heat butter and saute bay leaf, cardamom, and cumin", "Add the pureed paste and cook 5-7 minutes until oil separates", "Stir in cream, chili powder, garam masala, and salt", "Add paneer cubes and simmer 3-4 minutes", "Finish with kasuri methi (crush between palms before adding)", "Serve with naan or roti"]',
         '["Butter (not oil) is essential for authentic flavor", "Blend the base ultra-smooth for restaurant texture", "Kasuri methi is the secret finishing touch", "A swirl of cream on top makes it look restaurant-style"]',
         100),

        ('ic-dal-tadka-yellow', 'Dal Tadka (Yellow Lentils)',
         'Spiced yellow lentils (toor or moong dal) with a hot ghee tempering — different spice mix from Week 3',
         'indian-cuisine', 'beginner', '25 minutes',
         'https://images.unsplash.com/photo-1637194502510-09d5a08e7535?w=800&fit=crop&q=80', '🍲',
         '["1/2 cup toor dal or yellow moong dal", "2 cups water", "1/4 tsp turmeric", "Salt to taste", "1 tbsp ghee", "1/2 tsp cumin seeds", "1/2 tsp mustard seeds", "8-10 curry leaves", "1 dried red chili", "2 garlic cloves (chopped)", "1 green chili (slit)", "Fresh cilantro"]',
         '["Boil dal with turmeric and salt until soft (15-20 min for toor dal)", "Mash lightly to desired consistency", "TADKA: Heat ghee in a small pan", "Add cumin seeds and mustard seeds — wait for them to crackle", "Add curry leaves, dried red chili, garlic, and green chili", "When fragrant (30 seconds), pour the hot tadka into the dal", "Stir and simmer 2 minutes", "Adjust salt and garnish with cilantro"]',
         '["This uses curry leaves and mustard — a South Indian-style tadka", "Toor dal takes longer than masoor — use pressure cooker for speed", "The sizzle when tadka meets dal is the best sound in Indian cooking", "Compare this with Week 3 masoor dal to taste the difference"]',
         100),

        ('ic-veg-biryani', 'Vegetable Biryani',
         'Celebratory layered rice dish with mixed vegetables, whole spices, and aromatic seasoning',
         'indian-cuisine', 'intermediate', '45 minutes',
         'https://images.unsplash.com/photo-1707339088654-117df66bd55c?w=800&fit=crop&q=80', '🍚',
         '["1 cup basmati rice (soaked 20 min)", "1 carrot (diced)", "1/4 cup green beans (chopped)", "1/4 cup green peas", "1 onion (sliced thin)", "1 bay leaf", "1 cinnamon stick", "3 cardamom pods", "4 cloves", "1 tbsp ginger-garlic paste", "1 tsp biryani masala or chili powder", "2 cups water", "2 tbsp oil", "Salt to taste", "Fried onions for garnish (optional)"]',
         '["Rinse and soak basmati rice for 20 minutes, drain", "Chop mixed vegetables into small pieces", "Heat oil in a heavy-bottomed pot", "Add whole spices: bay leaf, cinnamon, cardamom, cloves", "Saute sliced onions until golden brown (5-7 min)", "Add ginger-garlic paste, cook 1 minute", "Add vegetables and biryani masala, cook 2 minutes", "Layer drained rice over the vegetables", "Pour 2 cups water and add salt", "Cover tightly and cook on low heat until rice is fluffy (15-18 min)", "Do not stir — let it cook undisturbed", "Garnish with fried onions if desired, fluff gently"]',
         '["Biryani is about layers — don''t mix the rice and vegetables while cooking", "Soaking rice is essential for long, separate grains", "The bottom layer (vegetables) flavors the rice through steam", "Tight lid is crucial — seal with foil if lid is loose"]',
         100),

        ('ic-salad-raita', 'Salad & Raita (Fresh Sides)',
         'Fresh cucumber-tomato salad and cooling yogurt raita — essential Indian meal accompaniments',
         'indian-cuisine', 'beginner', '15 minutes',
         'https://images.unsplash.com/photo-1508910238952-0dfebf373ecf?w=800&fit=crop&q=80', '🥗',
         '["FOR SALAD: 1 cucumber (diced)", "1 tomato (diced)", "1/4 red onion (sliced thin)", "Juice of 1 lemon", "Salt and pepper to taste", "FOR RAITA: 1 cup thick yogurt", "1/4 cucumber (grated)", "Salt to taste", "1/4 tsp cumin powder (roasted)", "Fresh mint or coriander (chopped)"]',
         '["SALAD: Dice cucumber and tomato into bite-sized pieces", "Slice red onion thinly", "Toss together with lemon juice, salt, and pepper", "RAITA: Whisk yogurt until smooth in a bowl", "Grate cucumber and squeeze out excess water", "Mix grated cucumber into yogurt", "Add salt and roasted cumin powder", "Garnish with chopped mint or coriander", "Chill both for 10 minutes before serving"]',
         '["Squeeze water from cucumber before adding to raita", "Roast cumin seeds in a dry pan then crush for best flavor", "Raita is meant to cool down spicy curries", "These light sides balance the rich curries perfectly"]',
         100),

        ('ic-grand-thali', 'Grand Finale Thali (Ultimate Feast)',
         'The ultimate 5-week graduation feast — combine ALL your skills into one magnificent Indian thali',
         'indian-cuisine', 'intermediate', '90 minutes',
         'https://images.unsplash.com/photo-1742281257687-092746ad6021?w=800&fit=crop&q=80', '🏆',
         '["Ingredients for roti or naan", "Ingredients for jeera rice or plain rice", "Ingredients for dal tadka", "Ingredients for paneer butter masala", "Leftover sabzis from the week", "Fresh salad and raita", "Pickle, papad, lemon wedges"]',
         '["PLAN YOUR TIMING: Start dal first (pressure cooker)", "Begin paneer butter masala while dal cooks", "Start rice when dal is almost done", "Reheat any leftover puri bhaji potato mix or other sabzis", "Prepare fresh raita and salad", "Roll and cook rotis or naan LAST — serve hot", "GRAND ASSEMBLY: Use a large round plate or thali", "Place rice in the center", "Arrange dal, paneer curry, and sabzi in small bowls around the plate", "Stack 2-3 rotis/naan on the side", "Add raita, salad, pickle, and papad", "Squeeze lemon over everything", "This is your 5-week graduation meal — you did it!"]',
         '["You now know knife skills, tempering, curry bases, bread-making, biryani, and more", "A thali represents the diversity of Indian cooking in one plate", "Mix and match any dishes you have learned over 5 weeks", "Pat yourself on the back — you have mastered Indian home cooking fundamentals!", "Next steps: try regional cuisines, experiment with your own masala blends"]',
         200)

        ON CONFLICT (id) DO NOTHING;
      `)
      await this.recordMigration('020_indian_plan_week5')
      logger.info('Indian cooking plan Week 5 recipes seeded')
    }

    // Migration 021: Multi-photo support (up to 3 photos per recipe)
    if (!(await this.isMigrationApplied('021_multi_photo'))) {
      await this.pool.query(`
        ALTER TABLE user_recipe_photos ADD COLUMN IF NOT EXISTS photo_number SMALLINT NOT NULL DEFAULT 1;
      `)
      // Drop old unique constraint if exists, add new composite one
      await this.pool.query(`
        ALTER TABLE user_recipe_photos DROP CONSTRAINT IF EXISTS user_recipe_photos_user_id_recipe_id_key;
      `)
      await this.pool.query(`
        DO $$ BEGIN
          ALTER TABLE user_recipe_photos ADD CONSTRAINT user_recipe_photos_user_id_recipe_id_photo_number_key
            UNIQUE(user_id, recipe_id, photo_number);
        EXCEPTION WHEN duplicate_table THEN NULL;
        END $$;
      `)
      await this.pool.query(`
        DO $$ BEGIN
          ALTER TABLE user_recipe_photos ADD CONSTRAINT user_recipe_photos_photo_number_check
            CHECK (photo_number BETWEEN 1 AND 3);
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `)
      await this.recordMigration('021_multi_photo')
      logger.info('Migration 021: Multi-photo support applied')
    }

    // Migration 022: Add onboarding tracking column
    if (!(await this.isMigrationApplied('022_onboarding'))) {
      await this.pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;
      `)
      await this.recordMigration('022_onboarding')
      logger.info('Migration 022: Onboarding column applied')
    }

    // Migration 023: Cook-to-unlock progression system
    if (!(await this.isMigrationApplied('023_cook_to_unlock'))) {
      // 1. Add gating columns to skills
      await this.pool.query(`
        ALTER TABLE skills ADD COLUMN IF NOT EXISTS initial_free_recipes INTEGER DEFAULT 3;
        ALTER TABLE skills ADD COLUMN IF NOT EXISTS recipes_per_unlock INTEGER DEFAULT 2;
        ALTER TABLE skills ADD COLUMN IF NOT EXISTS photos_to_unlock_next INTEGER DEFAULT 3;
      `)

      // 2. Add sort_order to recipes
      await this.pool.query(`
        ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
      `)

      // 3. Seed sort_order values matching SKILL_RECIPES array positions
      await this.pool.query(`
        UPDATE recipes SET sort_order = v.pos FROM (VALUES
          ('boiled-egg', 0), ('make-rice', 1), ('chop-onion', 2),
          ('sear-steak', 0), ('simmer-soup', 1), ('deep-fry', 2), ('stir-fry', 3), ('grill-chicken', 4),
          ('make-sauce', 0), ('season-taste', 1), ('herb-pairing', 2), ('spice-blend', 3), ('marinate', 4), ('balance-flavors', 5), ('umami-boost', 6),
          ('air-fryer-fries', 0), ('air-fryer-chicken-wings', 1), ('air-fryer-salmon', 2), ('air-fryer-vegetables', 3), ('air-fryer-tofu', 4), ('air-fryer-donuts', 5),
          ('dal-tadka', 0), ('butter-chicken', 1), ('jeera-rice', 2), ('aloo-gobi', 3), ('naan-bread', 4), ('chana-masala', 5), ('mango-lassi', 6),
          ('ic-cutting-onion', 7), ('ic-chai-and-eggs', 8), ('ic-masala-omelette', 9), ('ic-plain-rice', 10),
          ('ic-simple-dal', 11), ('ic-aloo-sabzi', 12), ('ic-first-full-meal', 13), ('ic-roti', 14),
          ('ic-egg-bhurji', 15), ('ic-upma', 16), ('ic-masala-base', 17), ('ic-full-thali', 18),
          ('ic-poha', 19), ('ic-paneer-bhurji', 20), ('ic-matar-paneer', 21), ('ic-veg-pulao', 22),
          ('ic-bhindi-masala', 23), ('ic-masoor-dal', 24), ('ic-week3-thali', 25),
          ('ic-aloo-paratha', 26), ('ic-paneer-tikka', 27), ('ic-gajar-matar', 28), ('ic-rajma-masala', 29),
          ('ic-kadhi', 30), ('ic-khichdi', 31), ('ic-week4-thali', 32),
          ('ic-puri-bhaji', 33), ('ic-besan-chilla', 34), ('ic-paneer-butter-masala', 35), ('ic-dal-tadka-yellow', 36),
          ('ic-veg-biryani', 37), ('ic-salad-raita', 38), ('ic-grand-thali', 39)
        ) AS v(recipe_id, pos) WHERE recipes.id = v.recipe_id;
      `)

      // 4. Add rating/privacy columns to user_posts (likes_count already exists from migration 016)
      await this.pool.query(`
        ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS taste_rating INTEGER CHECK (taste_rating BETWEEN 1 AND 5);
        ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5);
        ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
      `)

      // 5. Create xp_actions table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS xp_actions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action_type VARCHAR(50) NOT NULL,
          xp_amount INTEGER NOT NULL,
          reference_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_xp_actions_user ON xp_actions(user_id);
        CREATE INDEX IF NOT EXISTS idx_xp_actions_type ON xp_actions(action_type);
      `)

      // 6. Create user_badges table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_badges (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          badge_key VARCHAR(100) NOT NULL,
          badge_name VARCHAR(200) NOT NULL,
          badge_emoji VARCHAR(10),
          earned_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, badge_key)
        );
        CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
      `)

      // 7. Update skill configs: basic-cooking gets all free, others get 3/2/3
      await this.pool.query(`
        UPDATE skills SET initial_free_recipes = 99 WHERE id = 'basic-cooking';
        UPDATE skills SET initial_free_recipes = 3, recipes_per_unlock = 2, photos_to_unlock_next = 3
          WHERE id != 'basic-cooking';
      `)

      // 8. Add sort_order index on recipes
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_recipes_sort ON recipes(skill_id, sort_order);
      `)

      await this.recordMigration('023_cook_to_unlock')
      logger.info('Migration 023: Cook-to-unlock progression schema applied')
    }

    // Trust tiers, appeals, photo verifications, recipe views (migration 025)
    if (!(await this.isMigrationApplied('025_trust_and_signals'))) {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS user_trust_tiers (
          user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          tier TEXT NOT NULL DEFAULT 'new',
          verified_count INTEGER DEFAULT 0,
          rejected_count INTEGER DEFAULT 0,
          last_updated TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS photo_verifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipe_id TEXT NOT NULL,
          photo_url TEXT,
          dhash TEXT,
          signals JSONB DEFAULT '[]',
          passed_count INTEGER DEFAULT 0,
          total_count INTEGER DEFAULT 0,
          verdict TEXT NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_photo_verifications_user ON photo_verifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_photo_verifications_dhash ON photo_verifications(dhash);

        CREATE TABLE IF NOT EXISTS photo_appeals (
          id SERIAL PRIMARY KEY,
          verification_id INTEGER NOT NULL REFERENCES photo_verifications(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reason TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          reviewed_by INTEGER REFERENCES users(id),
          reviewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_appeals_user ON photo_appeals(user_id);
        CREATE INDEX IF NOT EXISTS idx_appeals_status ON photo_appeals(status);

        CREATE TABLE IF NOT EXISTS recipe_views (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipe_id TEXT NOT NULL,
          viewed_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_recipe_views_lookup ON recipe_views(user_id, recipe_id, viewed_at);
      `)
      await this.recordMigration('025_trust_and_signals')
      logger.info('Migration 025: Trust tiers, photo verifications, appeals, and recipe views applied')
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
  async getUserRecipePhotos(userId: number): Promise<{ recipe_id: string; photo_url: string; storage_key: string | null; photo_number: number; uploaded_at: string }[]> {
    const { rows } = await this.pool.query(
      'SELECT recipe_id, photo_url, storage_key, COALESCE(photo_number, 1) AS photo_number, uploaded_at FROM user_recipe_photos WHERE user_id = $1 ORDER BY recipe_id, photo_number',
      [userId]
    )
    return rows
  }

  async addRecipePhoto(userId: number, recipeId: string, photoUrl: string, storageKey: string): Promise<{ photo_url: string; recipe_id: string; photo_number: number }> {
    // Check count
    const { rows: countRows } = await this.pool.query(
      'SELECT COUNT(*)::int AS cnt FROM user_recipe_photos WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    )
    if (countRows[0].cnt >= 3) {
      throw new Error('Maximum 3 photos per recipe')
    }

    // Get next photo_number
    const { rows: maxRows } = await this.pool.query(
      'SELECT COALESCE(MAX(photo_number), 0) + 1 AS next_num FROM user_recipe_photos WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    )
    const photoNumber = Math.min(maxRows[0].next_num, 3)

    const { rows } = await this.pool.query(
      `INSERT INTO user_recipe_photos (user_id, recipe_id, photo_url, storage_key, photo_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING photo_url, recipe_id, photo_number`,
      [userId, recipeId, photoUrl, storageKey, photoNumber]
    )
    return rows[0]
  }

  /** @deprecated Use addRecipePhoto instead */
  async upsertRecipePhoto(userId: number, recipeId: string, photoUrl: string, storageKey: string): Promise<void> {
    await this.addRecipePhoto(userId, recipeId, photoUrl, storageKey)
  }

  async deleteRecipePhotoByNumber(userId: number, recipeId: string, photoNumber: number): Promise<{ storageKey: string } | null> {
    const { rows } = await this.pool.query(
      'DELETE FROM user_recipe_photos WHERE user_id = $1 AND recipe_id = $2 AND photo_number = $3 RETURNING storage_key',
      [userId, recipeId, photoNumber]
    )
    return rows[0] ? { storageKey: rows[0].storage_key } : null
  }

  async deleteRecipePhoto(userId: number, recipeId: string): Promise<{ storageKey: string } | null> {
    const { rows } = await this.pool.query(
      'DELETE FROM user_recipe_photos WHERE user_id = $1 AND recipe_id = $2 RETURNING storage_key',
      [userId, recipeId]
    )
    return rows[0] ? { storageKey: rows[0].storage_key } : null
  }

  async getRecipePhotoCount(userId: number, recipeId: string): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS cnt FROM user_recipe_photos WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    )
    return rows[0].cnt
  }

  async updatePostPhotoUrl(userId: number, recipeId: string, photoUrl: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_posts SET photo_url = $1 WHERE user_id = $2 AND recipe_id = $3 AND post_type = 'photo_upload'`,
      [photoUrl, userId, recipeId]
    )
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

  async getWorldFeed(userId: number, limit: number = 30, difficulty?: string): Promise<any[]> {
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    const params: any[] = [limit, userId];
    let whereClause = '';

    if (difficulty && validDifficulties.includes(difficulty)) {
      params.push(difficulty);
      whereClause = `WHERE r.difficulty = $${params.length}`;
    }

    const { rows } = await this.pool.query(
      `SELECT
        up.id, up.user_id, u.username, u.display_name, u.avatar_url,
        up.post_type, up.recipe_id, r.title AS recipe_title, r.image_url AS recipe_image_url,
        up.photo_url, up.caption, COALESCE(up.comments_count, 0) AS comments_count,
        COALESCE(up.likes_count, 0) AS likes_count,
        EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = up.id AND pl.user_id = $2) AS is_liked,
        up.created_at,
        COALESCE(
          (SELECT json_agg(urp.photo_url ORDER BY urp.photo_number)
           FROM user_recipe_photos urp
           WHERE urp.user_id = up.user_id AND urp.recipe_id = up.recipe_id),
          '[]'::json
        ) AS photos
       FROM user_posts up
       JOIN users u ON u.id = up.user_id
       LEFT JOIN recipes r ON r.id = up.recipe_id
       ${whereClause}
       ORDER BY up.created_at DESC
       LIMIT $1`,
      params
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
        up.photo_url, up.caption, COALESCE(up.comments_count, 0) AS comments_count,
        COALESCE(up.likes_count, 0) AS likes_count,
        EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = up.id AND pl.user_id = $1) AS is_liked,
        up.created_at,
        COALESCE(
          (SELECT json_agg(urp.photo_url ORDER BY urp.photo_number)
           FROM user_recipe_photos urp
           WHERE urp.user_id = up.user_id AND urp.recipe_id = up.recipe_id),
          '[]'::json
        ) AS photos
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

  // ── Post likes ──

  async togglePostLike(postId: number, userId: number): Promise<{ liked: boolean; likesCount: number }> {
    return this.transaction(async (client) => {
      const { rows: existing } = await client.query(
        'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
        [postId, userId]
      )
      if (existing.length > 0) {
        await client.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId])
        await client.query('UPDATE user_posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = $1', [postId])
      } else {
        await client.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [postId, userId])
        await client.query('UPDATE user_posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1', [postId])
      }
      const { rows } = await client.query('SELECT COALESCE(likes_count, 0) AS likes_count FROM user_posts WHERE id = $1', [postId])
      return { liked: existing.length === 0, likesCount: rows[0]?.likes_count ?? 0 }
    })
  }

  // ── Notifications ──

  async createNotification(userId: number, actorId: number, type: string, postId?: number): Promise<void> {
    if (userId === actorId) return
    await this.pool.query(
      'INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES ($1, $2, $3, $4)',
      [userId, actorId, type, postId ?? null]
    )
  }

  async getNotifications(userId: number, limit: number = 30): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT n.id, n.user_id, n.actor_id, u.username AS actor_username,
              u.display_name AS actor_display_name, u.avatar_url AS actor_avatar_url,
              n.type, n.post_id, up.caption AS post_caption,
              n.is_read, n.created_at
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       LEFT JOIN user_posts up ON up.id = n.post_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return rows
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    )
    return rows[0]?.count ?? 0
  }

  async markNotificationRead(notificationId: number, userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    )
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    )
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

  // ── Progression (cook-to-unlock) ──

  /** Count distinct recipes a user has posted photos for in a given skill */
  async getPhotoCountForSkill(userId: number, skillId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(DISTINCT urp.recipe_id)::int AS cnt
       FROM user_recipe_photos urp
       JOIN recipes r ON r.id = urp.recipe_id
       WHERE urp.user_id = $1 AND r.skill_id = $2`,
      [userId, skillId]
    )
    return rows[0].cnt
  }

  /** Get full progression state for a user in a skill */
  async getSkillProgression(userId: number, skillId: string): Promise<{
    skillId: string;
    totalRecipes: number;
    unlockedCount: number;
    photoCount: number;
    initialFree: number;
    recipesPerUnlock: number;
    recipes: { id: string; title: string; sortOrder: number; isUnlocked: boolean }[];
  }> {
    // Get skill config
    const skill = await this.getSkillById(skillId)
    const initialFree = skill?.initial_free_recipes ?? 3
    const recipesPerUnlock = skill?.recipes_per_unlock ?? 2

    // Get all recipes ordered by sort_order
    const { rows: recipes } = await this.pool.query(
      `SELECT id, title, sort_order
       FROM recipes
       WHERE skill_id = $1 AND is_active = TRUE
       ORDER BY sort_order`,
      [skillId]
    )

    // Get photo count for this skill
    const photoCount = await this.getPhotoCountForSkill(userId, skillId)

    const totalRecipes = recipes.length
    const unlockedCount = Math.min(totalRecipes, initialFree + photoCount * recipesPerUnlock)

    return {
      skillId,
      totalRecipes,
      unlockedCount,
      photoCount,
      initialFree,
      recipesPerUnlock,
      recipes: recipes.map((r: any, idx: number) => ({
        id: r.id,
        title: r.title,
        sortOrder: r.sort_order,
        isUnlocked: idx < unlockedCount,
      })),
    }
  }

  /** Get progression overview for all skills */
  async getProgressionOverview(userId: number): Promise<Array<{
    skillId: string;
    skillName: string;
    totalRecipes: number;
    unlockedCount: number;
    photoCount: number;
  }>> {
    const skills = await this.getAllSkills()
    const results = []
    for (const skill of skills) {
      const photoCount = await this.getPhotoCountForSkill(userId, skill.id)
      const initialFree = skill.initial_free_recipes ?? 3
      const recipesPerUnlock = skill.recipes_per_unlock ?? 2

      const { rows: recipeCountRows } = await this.pool.query(
        'SELECT COUNT(*)::int AS cnt FROM recipes WHERE skill_id = $1 AND is_active = TRUE',
        [skill.id]
      )
      const totalRecipes = recipeCountRows[0].cnt
      const unlockedCount = Math.min(totalRecipes, initialFree + photoCount * recipesPerUnlock)

      results.push({
        skillId: skill.id,
        skillName: skill.name,
        totalRecipes,
        unlockedCount,
        photoCount,
      })
    }
    return results
  }

  /** After photo upload, check which new recipes were unlocked */
  async getNewlyUnlockedRecipes(userId: number, skillId: string, previousPhotoCount: number): Promise<{ id: string; title: string }[]> {
    const skill = await this.getSkillById(skillId)
    const initialFree = skill?.initial_free_recipes ?? 3
    const recipesPerUnlock = skill?.recipes_per_unlock ?? 2

    const { rows: recipes } = await this.pool.query(
      `SELECT id, title, sort_order
       FROM recipes
       WHERE skill_id = $1 AND is_active = TRUE
       ORDER BY sort_order`,
      [skillId]
    )

    const totalRecipes = recipes.length
    const previousUnlocked = Math.min(totalRecipes, initialFree + previousPhotoCount * recipesPerUnlock)
    const currentPhotoCount = await this.getPhotoCountForSkill(userId, skillId)
    const currentUnlocked = Math.min(totalRecipes, initialFree + currentPhotoCount * recipesPerUnlock)

    if (currentUnlocked <= previousUnlocked) return []

    return recipes
      .slice(previousUnlocked, currentUnlocked)
      .map((r: any) => ({ id: r.id, title: r.title }))
  }

  // ── XP Actions ──

  async awardXP(userId: number, actionType: string, xpAmount: number, referenceId?: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO xp_actions (user_id, action_type, xp_amount, reference_id) VALUES ($1, $2, $3, $4)',
      [userId, actionType, xpAmount, referenceId ?? null]
    )
  }

  async getUserTotalXP(userId: number): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COALESCE(SUM(xp_amount), 0)::int AS total_xp FROM xp_actions WHERE user_id = $1',
      [userId]
    )
    return rows[0].total_xp
  }

  // ── Badges ──

  private static BADGE_DEFINITIONS = [
    { key: 'first_cook', name: 'First Cook', emoji: '🍳', check: (stats: any) => stats.recipesCompleted >= 1 },
    { key: 'five_dishes', name: 'Five Dishes', emoji: '🥘', check: (stats: any) => stats.recipesCompleted >= 5 },
    { key: 'ten_dishes', name: 'Ten Dishes', emoji: '🏅', check: (stats: any) => stats.recipesCompleted >= 10 },
    { key: 'photo_starter', name: 'Photo Starter', emoji: '📸', check: (stats: any) => stats.photosPosted >= 1 },
    { key: 'photo_pro', name: 'Photo Pro', emoji: '🎞️', check: (stats: any) => stats.photosPosted >= 10 },
    { key: 'social_butterfly', name: 'Social Butterfly', emoji: '🦋', check: (stats: any) => stats.likesReceived >= 10 },
    { key: 'master_basic', name: 'Basic Cooking Master', emoji: '⭐', check: (stats: any) => (stats.skillCompletion['basic-cooking'] ?? 0) >= 100 },
    { key: 'master_heat', name: 'Heat Control Master', emoji: '🔥', check: (stats: any) => (stats.skillCompletion['heat-control'] ?? 0) >= 100 },
    { key: 'master_flavor', name: 'Flavor Building Master', emoji: '🧂', check: (stats: any) => (stats.skillCompletion['flavor-building'] ?? 0) >= 100 },
    { key: 'master_airfryer', name: 'Air Fryer Master', emoji: '💨', check: (stats: any) => (stats.skillCompletion['air-fryer'] ?? 0) >= 100 },
    { key: 'master_indian', name: 'Indian Cuisine Master', emoji: '🍛', check: (stats: any) => (stats.skillCompletion['indian-cuisine'] ?? 0) >= 100 },
  ]

  /** Check all badge definitions and award any newly earned badges. Returns newly earned badges. */
  async checkAndAwardBadges(userId: number): Promise<{ badgeKey: string; badgeName: string; badgeEmoji: string }[]> {
    // Gather stats
    const { rows: recipeRows } = await this.pool.query(
      "SELECT COUNT(*)::int AS cnt FROM user_recipe_progress WHERE user_id = $1 AND status IN ('completed', 'mastered')",
      [userId]
    )
    const recipesCompleted = recipeRows[0].cnt

    const { rows: photoRows } = await this.pool.query(
      'SELECT COUNT(DISTINCT recipe_id)::int AS cnt FROM user_recipe_photos WHERE user_id = $1',
      [userId]
    )
    const photosPosted = photoRows[0].cnt

    const { rows: likeRows } = await this.pool.query(
      `SELECT COUNT(*)::int AS cnt FROM post_likes pl
       JOIN user_posts up ON up.id = pl.post_id
       WHERE up.user_id = $1`,
      [userId]
    )
    const likesReceived = likeRows[0].cnt

    // Skill completion percentages
    const skills = await this.getAllSkills()
    const skillCompletion: Record<string, number> = {}
    for (const skill of skills) {
      const { rows: totalRows } = await this.pool.query(
        'SELECT COUNT(*)::int AS cnt FROM recipes WHERE skill_id = $1 AND is_active = TRUE',
        [skill.id]
      )
      const { rows: completedRows } = await this.pool.query(
        `SELECT COUNT(*)::int AS cnt FROM user_recipe_progress urp
         JOIN recipes r ON r.id = urp.recipe_id
         WHERE urp.user_id = $1 AND r.skill_id = $2 AND urp.status IN ('completed', 'mastered')`,
        [userId, skill.id]
      )
      const total = totalRows[0].cnt
      skillCompletion[skill.id] = total > 0 ? Math.round((completedRows[0].cnt / total) * 100) : 0
    }

    const stats = { recipesCompleted, photosPosted, likesReceived, skillCompletion }

    // Get already-earned badges
    const { rows: earnedRows } = await this.pool.query(
      'SELECT badge_key FROM user_badges WHERE user_id = $1',
      [userId]
    )
    const earnedKeys = new Set(earnedRows.map((r: any) => r.badge_key))

    // Check each definition
    const newBadges: { badgeKey: string; badgeName: string; badgeEmoji: string }[] = []
    for (const def of DatabaseServiceClass.BADGE_DEFINITIONS) {
      if (!earnedKeys.has(def.key) && def.check(stats)) {
        await this.pool.query(
          'INSERT INTO user_badges (user_id, badge_key, badge_name, badge_emoji) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
          [userId, def.key, def.name, def.emoji]
        )
        newBadges.push({ badgeKey: def.key, badgeName: def.name, badgeEmoji: def.emoji })
      }
    }

    return newBadges
  }

  // ── Leaderboard ──

  async getWeeklyLeaderboard(limit: number = 20): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              COUNT(DISTINCT urp.recipe_id)::int AS dishes_this_week,
              COALESCE(SUM(xa.xp_amount), 0)::int AS xp_this_week
       FROM users u
       LEFT JOIN user_recipe_progress urp
         ON urp.user_id = u.id
         AND urp.status IN ('completed', 'mastered')
         AND urp.completed_at >= date_trunc('week', NOW())
       LEFT JOIN xp_actions xa
         ON xa.user_id = u.id
         AND xa.created_at >= date_trunc('week', NOW())
       WHERE u.is_active = TRUE AND u.is_allowed = TRUE
       GROUP BY u.id
       HAVING COUNT(DISTINCT urp.recipe_id) > 0 OR COALESCE(SUM(xa.xp_amount), 0) > 0
       ORDER BY dishes_this_week DESC, xp_this_week DESC
       LIMIT $1`,
      [limit]
    )
    return rows
  }

  // ── Streak helpers ──

  /** Calculate current streak days from user completion dates */
  async getUserStreakDays(userId: number): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT completed_at::date AS d
       FROM user_recipe_progress
       WHERE user_id = $1 AND status IN ('completed', 'mastered') AND completed_at IS NOT NULL
       ORDER BY d DESC`,
      [userId]
    )

    if (rows.length === 0) return 0

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const dates = rows.map((r: any) => r.d.toISOString().split('T')[0])

    let streak = 0
    let checkDate: string = dates.includes(today) ? today : (dates.includes(yesterday) ? yesterday : '')
    if (!checkDate) return 0

    streak = 1
    for (let i = 1; i < 365; i++) {
      const prevDate: string = new Date(new Date(checkDate).getTime() - 86400000).toISOString().split('T')[0]
      if (dates.includes(prevDate)) {
        streak++
        checkDate = prevDate
      } else {
        break
      }
    }
    return streak
  }

  /** Award streak bonus XP based on streak milestones */
  async awardStreakBonus(userId: number, streakDays: number): Promise<{ bonusXP: number; milestone: number } | null> {
    const milestones = [
      { days: 30, xp: 200 },
      { days: 14, xp: 100 },
      { days: 7, xp: 50 },
      { days: 3, xp: 25 },
    ]

    for (const m of milestones) {
      if (streakDays === m.days) {
        // Check if already awarded for this milestone today
        const { rows } = await this.pool.query(
          `SELECT id FROM xp_actions
           WHERE user_id = $1 AND action_type = 'streak_bonus' AND reference_id = $2
             AND created_at >= CURRENT_DATE`,
          [userId, `streak:${m.days}`]
        )
        if (rows.length === 0) {
          await this.awardXP(userId, 'streak_bonus', m.xp, `streak:${m.days}`)
          return { bonusXP: m.xp, milestone: m.days }
        }
      }
    }
    return null
  }

  // ── Engagement notifications ──

  async getEngagementNotifications(userId: number): Promise<any[]> {
    const notifications: any[] = []

    // 1. Check if near unlock
    const overview = await this.getProgressionOverview(userId)
    for (const skill of overview) {
      if (skill.unlockedCount < skill.totalRecipes) {
        const skillConfig = await this.getSkillById(skill.skillId)
        const recipesPerUnlock = skillConfig?.recipes_per_unlock ?? 2
        const photosNeeded = Math.ceil((skill.unlockedCount - (skillConfig?.initial_free_recipes ?? 3)) / recipesPerUnlock) + 1 - skill.photoCount
        if (photosNeeded > 0 && photosNeeded <= 2) {
          notifications.push({
            type: 'unlock_near',
            message: `${photosNeeded} photo${photosNeeded > 1 ? 's' : ''} from unlocking ${recipesPerUnlock} new ${skill.skillName} recipes`,
            skillId: skill.skillId,
          })
        }
      }
    }

    // 2. Recent likes on user posts
    const { rows: likeRows } = await this.pool.query(
      `SELECT up.id, COUNT(pl.id)::int AS like_count
       FROM user_posts up
       JOIN post_likes pl ON pl.post_id = up.id AND pl.created_at >= NOW() - INTERVAL '7 days'
       WHERE up.user_id = $1
       GROUP BY up.id
       HAVING COUNT(pl.id) > 0
       ORDER BY like_count DESC LIMIT 3`,
      [userId]
    )
    for (const row of likeRows) {
      notifications.push({
        type: 'post_liked',
        message: `Your dish got ${row.like_count} like${row.like_count > 1 ? 's' : ''} this week`,
        postId: row.id,
      })
    }

    // 3. Streak milestone
    const streakDays = await this.getUserStreakDays(userId)
    if (streakDays >= 3) {
      notifications.push({
        type: 'streak_milestone',
        message: `${streakDays}-day streak!`,
        streakDays,
      })
    }

    return notifications
  }

  async getUserBadges(userId: number): Promise<{ badgeKey: string; badgeName: string; badgeEmoji: string; earnedAt: string }[]> {
    const { rows } = await this.pool.query(
      'SELECT badge_key, badge_name, badge_emoji, earned_at FROM user_badges WHERE user_id = $1 ORDER BY earned_at',
      [userId]
    )
    return rows.map((r: any) => ({
      badgeKey: r.badge_key,
      badgeName: r.badge_name,
      badgeEmoji: r.badge_emoji,
      earnedAt: r.earned_at,
    }))
  }

  async getAllBadgeDefinitions(userId: number): Promise<{ badgeKey: string; badgeName: string; badgeEmoji: string; earned: boolean; earnedAt: string | null }[]> {
    const earned = await this.getUserBadges(userId)
    const earnedMap = new Map(earned.map(b => [b.badgeKey, b.earnedAt]))

    return DatabaseServiceClass.BADGE_DEFINITIONS.map(def => ({
      badgeKey: def.key,
      badgeName: def.name,
      badgeEmoji: def.emoji,
      earned: earnedMap.has(def.key),
      earnedAt: earnedMap.get(def.key) ?? null,
    }))
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

  // --- Photo verification & trust tier helpers ---

  async getRecentRecipeView(userId: number, recipeId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM recipe_views
       WHERE user_id = $1 AND recipe_id = $2 AND viewed_at > NOW() - INTERVAL '30 minutes'
       LIMIT 1`,
      [userId, recipeId]
    )
    return rows.length > 0
  }

  async recordRecipeView(userId: number, recipeId: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO recipe_views (user_id, recipe_id) VALUES ($1, $2)',
      [userId, recipeId]
    )
  }

  async getUserPhotoHashes(userId: number, limit: number = 50): Promise<string[]> {
    const { rows } = await this.pool.query(
      `SELECT dhash FROM photo_verifications
       WHERE user_id = $1 AND dhash IS NOT NULL
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    )
    return rows.map((r: { dhash: string }) => r.dhash)
  }

  async getUserTrustTier(userId: number): Promise<{ tier: string; verified_count: number }> {
    const { rows } = await this.pool.query(
      'SELECT tier, verified_count FROM user_trust_tiers WHERE user_id = $1',
      [userId]
    )
    if (rows.length === 0) {
      return { tier: 'new', verified_count: 0 }
    }
    return { tier: rows[0].tier, verified_count: rows[0].verified_count }
  }

  async updateTrustTier(userId: number, verdict: 'verified' | 'rejected'): Promise<void> {
    const col = verdict === 'verified' ? 'verified_count' : 'rejected_count'
    await this.pool.query(
      `INSERT INTO user_trust_tiers (user_id, ${col})
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE SET
         ${col} = user_trust_tiers.${col} + 1,
         last_updated = NOW()`,
      [userId]
    )
    // Recalculate tier based on verified_count
    await this.pool.query(
      `UPDATE user_trust_tiers SET tier = CASE
         WHEN verified_count >= 20 THEN 'veteran'
         WHEN verified_count >= 5 THEN 'trusted'
         ELSE 'new'
       END
       WHERE user_id = $1`,
      [userId]
    )
  }

  async savePhotoVerification(
    userId: number,
    recipeId: string,
    photoUrl: string | null,
    dhash: string | null,
    signals: { name: string; score: number; passed: boolean; details: string }[],
    verdict: string
  ): Promise<number> {
    const passedCount = signals.filter(s => s.passed).length
    const { rows } = await this.pool.query(
      `INSERT INTO photo_verifications (user_id, recipe_id, photo_url, dhash, signals, passed_count, total_count, verdict)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [userId, recipeId, photoUrl, dhash, JSON.stringify(signals), passedCount, signals.length, verdict]
    )
    return rows[0].id
  }

  // --- Appeals ---

  async createAppeal(userId: number, verificationId: number, reason?: string): Promise<{ id: number; status: string; created_at: string }> {
    const { rows } = await this.pool.query(
      `INSERT INTO photo_appeals (verification_id, user_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id, status, created_at`,
      [verificationId, userId, reason || null]
    )
    return rows[0]
  }

  async getVerificationById(verificationId: number): Promise<{ id: number; user_id: number; verdict: string; passed_count: number } | null> {
    const { rows } = await this.pool.query(
      'SELECT id, user_id, verdict, passed_count FROM photo_verifications WHERE id = $1',
      [verificationId]
    )
    return rows[0] || null
  }

  async getPendingAppealForVerification(verificationId: number): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT 1 FROM photo_appeals WHERE verification_id = $1 AND status = 'pending'`,
      [verificationId]
    )
    return rows.length > 0
  }

  async getUserDailyAppealCount(userId: number): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*) AS count FROM photo_appeals
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [userId]
    )
    return parseInt(rows[0].count, 10)
  }

  async getUserAppeals(userId: number): Promise<Array<{
    id: number; verification_id: number; reason: string | null;
    status: string; created_at: string; verdict: string; passed_count: number;
  }>> {
    const { rows } = await this.pool.query(
      `SELECT a.id, a.verification_id, a.reason, a.status, a.created_at,
              v.verdict, v.passed_count
       FROM photo_appeals a
       JOIN photo_verifications v ON v.id = a.verification_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [userId]
    )
    return rows
  }

  async resolveAppeal(appealId: number, adminId: number, status: 'approved' | 'denied'): Promise<{
    appeal: { id: number; verification_id: number; user_id: number; status: string; reviewed_at: string } | null;
    previousVerdict: string | null;
  }> {
    const { rows } = await this.pool.query(
      `UPDATE photo_appeals SET status = $1, reviewed_by = $2, reviewed_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING id, verification_id, user_id, status, reviewed_at`,
      [status, adminId, appealId]
    )
    if (rows.length === 0) return { appeal: null, previousVerdict: null }

    const appeal = rows[0]

    // Get previous verdict
    const { rows: vRows } = await this.pool.query(
      'SELECT verdict FROM photo_verifications WHERE id = $1',
      [appeal.verification_id]
    )
    const previousVerdict = vRows[0]?.verdict || null

    return { appeal, previousVerdict }
  }

  async updateVerificationVerdict(verificationId: number, newVerdict: string): Promise<void> {
    await this.pool.query(
      'UPDATE photo_verifications SET verdict = $1 WHERE id = $2',
      [newVerdict, verificationId]
    )
  }

  async getVerificationStats(): Promise<{
    totalVerified: number;
    verdictBreakdown: { accepted: number; marginal: number; rejected: number };
    avgScore: number;
    appealStats: { pending: number; approved: number; denied: number };
    trustTierDistribution: { new: number; trusted: number; veteran: number };
  }> {
    // Verdict breakdown
    const { rows: verdictRows } = await this.pool.query(
      `SELECT verdict, COUNT(*) AS count FROM photo_verifications GROUP BY verdict`
    )
    const verdictBreakdown = { accepted: 0, marginal: 0, rejected: 0 }
    let totalVerified = 0
    for (const row of verdictRows) {
      const v = row.verdict as keyof typeof verdictBreakdown
      if (v in verdictBreakdown) verdictBreakdown[v] = parseInt(row.count, 10)
      totalVerified += parseInt(row.count, 10)
    }

    // Average score
    const { rows: avgRows } = await this.pool.query(
      `SELECT COALESCE(AVG(passed_count), 0) AS avg_score FROM photo_verifications`
    )
    const avgScore = parseFloat(avgRows[0].avg_score) || 0

    // Appeal stats
    const { rows: appealRows } = await this.pool.query(
      `SELECT status, COUNT(*) AS count FROM photo_appeals GROUP BY status`
    )
    const appealStats = { pending: 0, approved: 0, denied: 0 }
    for (const row of appealRows) {
      const s = row.status as keyof typeof appealStats
      if (s in appealStats) appealStats[s] = parseInt(row.count, 10)
    }

    // Trust tier distribution
    const { rows: tierRows } = await this.pool.query(
      `SELECT tier, COUNT(*) AS count FROM user_trust_tiers GROUP BY tier`
    )
    const trustTierDistribution = { new: 0, trusted: 0, veteran: 0 }
    for (const row of tierRows) {
      const t = row.tier as keyof typeof trustTierDistribution
      if (t in trustTierDistribution) trustTierDistribution[t] = parseInt(row.count, 10)
    }

    return { totalVerified, verdictBreakdown, avgScore, appealStats, trustTierDistribution }
  }

  // Get recipe_id from verification for progression recalculation
  async getVerificationRecipeInfo(verificationId: number): Promise<{ recipe_id: string; user_id: number } | null> {
    const { rows } = await this.pool.query(
      'SELECT recipe_id, user_id FROM photo_verifications WHERE id = $1',
      [verificationId]
    )
    return rows[0] || null
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

// Create singleton instance
export const DatabaseService = new DatabaseServiceClass()
