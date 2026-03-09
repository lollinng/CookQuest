-- Migration 023: Cook-to-unlock progression system
-- Adds recipe gating, post ratings, XP actions, and badges

-- 1. Add gating columns to skills
ALTER TABLE skills ADD COLUMN IF NOT EXISTS initial_free_recipes INTEGER DEFAULT 3;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS recipes_per_unlock INTEGER DEFAULT 2;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS photos_to_unlock_next INTEGER DEFAULT 3;

-- 2. Add sort_order to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 3. Seed sort_order values matching SKILL_RECIPES array positions
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

-- 4. Add rating/privacy columns to user_posts
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS taste_rating INTEGER CHECK (taste_rating BETWEEN 1 AND 5);
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5);
ALTER TABLE user_posts ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 5. Create xp_actions table
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

-- 6. Create user_badges table
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

-- 7. Update skill configs: basic-cooking gets all free, others get 3/2/3
UPDATE skills SET initial_free_recipes = 99 WHERE id = 'basic-cooking';
UPDATE skills SET initial_free_recipes = 3, recipes_per_unlock = 2, photos_to_unlock_next = 3
  WHERE id != 'basic-cooking';

-- 8. Composite index for recipe ordering within skills
CREATE INDEX IF NOT EXISTS idx_recipes_sort ON recipes(skill_id, sort_order);
