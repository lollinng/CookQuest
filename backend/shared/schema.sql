-- CookQuest Database Schema
-- Designed for SQLite initially, with PostgreSQL migration path

-- ================================
-- User Management
-- ================================

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Use SERIAL for PostgreSQL
    uuid TEXT UNIQUE NOT NULL DEFAULT (lower(hex(randomblob(16)))), -- Use UUID type for PostgreSQL
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
    preferences TEXT DEFAULT '{}' -- JSON string, use JSONB for PostgreSQL
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE skills (
    id TEXT PRIMARY KEY, -- 'basic-cooking', 'heat-control', 'flavor-building'
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

CREATE TABLE recipes (
    id TEXT PRIMARY KEY, -- 'boiled-egg', 'sear-steak', etc.
    title TEXT NOT NULL,
    description TEXT,
    skill_id TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    total_time TEXT, -- display format like "20 minutes"
    servings INTEGER,
    image_url TEXT,
    emoji TEXT,
    instructions TEXT NOT NULL, -- JSON array
    ingredients TEXT NOT NULL, -- JSON array
    tips TEXT, -- JSON array
    nutrition_facts TEXT, -- JSON object
    tags TEXT, -- JSON array for search/filtering
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id)
);

-- Recipe ratings and reviews
CREATE TABLE recipe_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE user_recipe_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

-- User skill progress
CREATE TABLE user_skill_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    category TEXT, -- 'skill', 'progress', 'streak', 'social'
    requirements TEXT, -- JSON object with achievement criteria
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id TEXT NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress INTEGER DEFAULT 100, -- percentage completed
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE(user_id, achievement_id)
);

-- ================================
-- Cooking Sessions & Analytics
-- ================================

CREATE TABLE cooking_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id TEXT NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration INTEGER, -- seconds
    success BOOLEAN,
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    notes TEXT,
    photos TEXT, -- JSON array of photo URLs
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- ================================
-- AI/ML Features
-- ================================

-- Store user preferences for recommendations
CREATE TABLE user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    dietary_restrictions TEXT, -- JSON array: ['vegetarian', 'gluten-free', etc.]
    cuisine_preferences TEXT, -- JSON array: ['italian', 'asian', etc.]
    cooking_time_preference INTEGER, -- max minutes
    skill_focus TEXT, -- which skill they want to improve
    equipment TEXT, -- JSON array of available equipment
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id)
);

-- Track recommendation performance
CREATE TABLE recommendation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id TEXT NOT NULL,
    event_type TEXT CHECK (event_type IN ('shown', 'clicked', 'started', 'completed')),
    context TEXT, -- JSON object with recommendation context
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- ================================
-- Content Management
-- ================================

-- Cooking tips from AI
CREATE TABLE cooking_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT CHECK (category IN ('technique', 'ingredient', 'tool', 'safety', 'general')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    tags TEXT, -- JSON array
    source TEXT DEFAULT 'ai_generated',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily challenges and events
CREATE TABLE challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT CHECK (challenge_type IN ('daily', 'weekly', 'seasonal', 'skill-based')),
    recipe_ids TEXT, -- JSON array of recipe IDs
    start_date DATE,
    end_date DATE,
    reward_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_challenge_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0, -- percentage or count
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE(user_id, challenge_id)
);

-- ================================
-- Indexes for Performance
-- ================================

-- User sessions
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Recipe searches
CREATE INDEX idx_recipes_skill ON recipes(skill_id);
CREATE INDEX idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX idx_recipes_active ON recipes(is_active);

-- User progress
CREATE INDEX idx_user_recipe_progress_user ON user_recipe_progress(user_id);
CREATE INDEX idx_user_recipe_progress_recipe ON user_recipe_progress(recipe_id);
CREATE INDEX idx_user_recipe_progress_status ON user_recipe_progress(status);
CREATE INDEX idx_user_skill_progress_user ON user_skill_progress(user_id);

-- Analytics
CREATE INDEX idx_cooking_sessions_user ON cooking_sessions(user_id);
CREATE INDEX idx_cooking_sessions_recipe ON cooking_sessions(recipe_id);
CREATE INDEX idx_cooking_sessions_date ON cooking_sessions(started_at);
CREATE INDEX idx_recommendation_events_user ON recommendation_events(user_id);
CREATE INDEX idx_recommendation_events_type ON recommendation_events(event_type);