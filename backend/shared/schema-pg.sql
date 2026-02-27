-- CookQuest PostgreSQL Schema
-- Converted from SQLite schema for PostgreSQL

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================
-- User Management
-- ================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    preferences JSONB DEFAULT '{}'
);

-- User sessions for authentication
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ================================
-- Skills System
-- ================================

CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- Recipe Management
-- ================================

CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    skill_id TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    prep_time INTEGER,
    cook_time INTEGER,
    total_time TEXT,
    servings INTEGER,
    image_url TEXT,
    emoji TEXT,
    instructions JSONB NOT NULL,
    ingredients JSONB NOT NULL,
    tips JSONB,
    nutrition_facts JSONB,
    tags JSONB,
    xp_reward INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Recipe ratings and reviews
CREATE TABLE IF NOT EXISTS recipe_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    recipe_id TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(user_id, recipe_id)
);

-- ================================
-- User Progress Tracking
-- ================================

CREATE TABLE IF NOT EXISTS user_recipe_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    recipe_id TEXT NOT NULL,
    status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')),
    completed_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS user_skill_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    skill_id TEXT NOT NULL,
    completed_recipes INTEGER DEFAULT 0,
    total_recipes INTEGER DEFAULT 0,
    mastery_level TEXT CHECK (mastery_level IN ('beginner', 'developing', 'proficient', 'expert')),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    UNIQUE(user_id, skill_id)
);

-- ================================
-- Achievements & Gamification
-- ================================

CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT,
    requirements JSONB,
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 100,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
);

-- ================================
-- Cooking Sessions & Analytics
-- ================================

CREATE TABLE IF NOT EXISTS cooking_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    recipe_id TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration INTEGER,
    success BOOLEAN,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    notes TEXT,
    photos JSONB,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- ================================
-- AI/ML Features
-- ================================

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    dietary_restrictions JSONB,
    cuisine_preferences JSONB,
    cooking_time_preference INTEGER,
    skill_focus TEXT,
    equipment JSONB,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS recommendation_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    recipe_id TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN ('shown', 'clicked', 'started', 'completed')),
    context JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- ================================
-- Content Management
-- ================================

CREATE TABLE IF NOT EXISTS cooking_tips (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT CHECK (category IN ('technique', 'ingredient', 'tool', 'safety', 'general')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    tags JSONB,
    source TEXT DEFAULT 'ai_generated',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT CHECK (challenge_type IN ('daily', 'weekly', 'seasonal', 'skill-based')),
    recipe_ids JSONB,
    start_date DATE,
    end_date DATE,
    reward_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE(user_id, challenge_id)
);

-- ================================
-- Indexes for Performance
-- ================================

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_recipes_skill ON recipes(skill_id);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_active ON recipes(is_active);

CREATE INDEX IF NOT EXISTS idx_user_recipe_progress_user ON user_recipe_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_progress_recipe ON user_recipe_progress(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_progress_status ON user_recipe_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_skill_progress_user ON user_skill_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_cooking_sessions_user ON cooking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_recipe ON cooking_sessions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_cooking_sessions_date ON cooking_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_user ON recommendation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_type ON recommendation_events(event_type);

-- ================================
-- User Recipe Photos
-- ================================

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
