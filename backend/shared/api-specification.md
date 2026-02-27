# CookQuest API Specification v1.0

## Overview

The CookQuest API is designed as a microservices architecture with two main services:
- **Node.js API Server**: User management, recipes, progress tracking
- **Python AI Service**: Recommendations, tips, AI features

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

Inter-service communication uses service tokens for security.

## Base URLs

- **Node.js API**: `http://localhost:3001/api/v1`
- **Python AI Service**: `http://localhost:8000/api/v1`
- **Production**: `https://api.cookquest.app/api/v1`

---

## Node.js API Endpoints

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "cookingmaster",
  "displayName": "Cooking Master" // optional
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "cookingmaster",
    "displayName": "Cooking Master"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "cookingmaster",
    "displayName": "Cooking Master"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/logout
Invalidate current session.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

#### POST /auth/refresh
Refresh access token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "message": "Token refreshed",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### GET /auth/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "cookingmaster",
    "displayName": "Cooking Master",
    "avatarUrl": null,
    "createdAt": "2024-01-15T10:30:00Z",
    "preferences": {
      "dietary_restrictions": ["vegetarian"],
      "skill_focus": "flavor-building"
    }
  }
}
```

### Recipe Endpoints

#### GET /recipes
Get all recipes with optional filtering.

**Query Parameters:**
- `skill`: Filter by skill ID (`basic-cooking`, `heat-control`, `flavor-building`)
- `difficulty`: Filter by difficulty (`beginner`, `intermediate`, `advanced`)
- `time`: Filter by maximum cooking time in minutes
- `search`: Search in title and description
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response (200):**
```json
{
  "recipes": [
    {
      "id": "boiled-egg",
      "title": "Perfect Boiled Egg",
      "description": "Learn the basics of boiling eggs to perfection",
      "skill": "basic-cooking",
      "difficulty": "beginner",
      "prepTime": 2,
      "cookTime": 8,
      "totalTime": "10 minutes",
      "servings": 2,
      "imageUrl": "https://images.unsplash.com/...",
      "emoji": "🥚",
      "ingredients": ["2 large eggs", "Water", "Salt", "Ice water"],
      "instructions": ["Bring water to boil", "..."],
      "tips": ["Use week-old eggs", "..."],
      "tags": ["protein", "breakfast", "easy"],
      "averageRating": 4.5,
      "reviewCount": 128,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### GET /recipes/:id
Get a specific recipe by ID.

**Response (200):**
```json
{
  "recipe": {
    "id": "boiled-egg",
    "title": "Perfect Boiled Egg",
    "description": "Learn the basics of boiling eggs to perfection",
    "skill": "basic-cooking",
    "difficulty": "beginner",
    "prepTime": 2,
    "cookTime": 8,
    "totalTime": "10 minutes",
    "servings": 2,
    "imageUrl": "https://images.unsplash.com/...",
    "emoji": "🥚",
    "ingredients": ["2 large eggs", "Water (enough to cover eggs)", "Salt (pinch)", "Ice water for cooling"],
    "instructions": ["Bring a pot of water to a rolling boil", "Gently lower eggs into the boiling water using a spoon", "Cook for 6-7 minutes for soft-boiled, 8-10 for hard-boiled", "Immediately transfer to ice water to stop cooking", "Let cool for 2 minutes before peeling"],
    "tips": ["Use eggs that are at least a week old for easier peeling", "Start timing once the water returns to a boil", "The ice bath prevents overcooking and gray rings"],
    "nutritionFacts": {
      "calories": 155,
      "protein": "12g",
      "carbs": "1g",
      "fat": "11g"
    },
    "tags": ["protein", "breakfast", "easy"],
    "averageRating": 4.5,
    "reviewCount": 128,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /recipes/:id/review
Add a review for a recipe.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "rating": 5,
  "reviewText": "This technique worked perfectly! The eggs were cooked exactly how I wanted them."
}
```

**Response (201):**
```json
{
  "message": "Review added successfully",
  "review": {
    "id": 1,
    "userId": 1,
    "recipeId": "boiled-egg",
    "rating": 5,
    "reviewText": "This technique worked perfectly!",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Skills Endpoints

#### GET /skills
Get all available skills.

**Response (200):**
```json
{
  "skills": [
    {
      "id": "basic-cooking",
      "name": "Basic Cooking",
      "description": "Essential cooking fundamentals",
      "icon": "👨‍🍳",
      "color": "blue",
      "sortOrder": 1,
      "totalRecipes": 3,
      "isActive": true
    },
    {
      "id": "heat-control",
      "name": "Heat Control",
      "description": "Master temperature and timing",
      "icon": "🔥",
      "color": "orange",
      "sortOrder": 2,
      "totalRecipes": 5,
      "isActive": true
    },
    {
      "id": "flavor-building",
      "name": "Flavor Building",
      "description": "Develop complex, balanced flavors",
      "icon": "🌟",
      "color": "purple",
      "sortOrder": 3,
      "totalRecipes": 7,
      "isActive": true
    }
  ]
}
```

#### GET /skills/:id/recipes
Get all recipes for a specific skill.

**Response (200):**
```json
{
  "skill": {
    "id": "basic-cooking",
    "name": "Basic Cooking",
    "description": "Essential cooking fundamentals",
    "icon": "👨‍🍳",
    "color": "blue"
  },
  "recipes": [
    {
      "id": "boiled-egg",
      "title": "Perfect Boiled Egg",
      "difficulty": "beginner",
      "totalTime": "10 minutes",
      "imageUrl": "https://images.unsplash.com/...",
      "emoji": "🥚",
      "averageRating": 4.5
    }
  ],
  "totalRecipes": 3
}
```

### Progress Endpoints

#### GET /progress
Get user's overall progress summary.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "progress": {
    "overall": {
      "completed": 8,
      "total": 24,
      "percentage": 33
    },
    "skills": {
      "basic-cooking": {
        "completed": 3,
        "total": 3,
        "percentage": 100,
        "masteryLevel": "proficient"
      },
      "heat-control": {
        "completed": 2,
        "total": 5,
        "percentage": 40,
        "masteryLevel": "developing"
      },
      "flavor-building": {
        "completed": 3,
        "total": 7,
        "percentage": 43,
        "masteryLevel": "developing"
      }
    },
    "streak": {
      "current": 5,
      "longest": 12,
      "lastActivityAt": "2024-01-15T08:30:00Z"
    },
    "level": {
      "current": 3,
      "experience": 450,
      "nextLevelAt": 500,
      "progressToNext": 90
    }
  }
}
```

#### POST /progress/recipes/:recipeId
Update progress for a specific recipe.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "completed", // "not_started" | "in_progress" | "completed" | "mastered"
  "notes": "Nailed the timing! Eggs were perfect.",
  "difficultyRating": 3,
  "success": true
}
```

**Response (200):**
```json
{
  "message": "Recipe progress updated",
  "progress": {
    "recipeId": "boiled-egg",
    "status": "completed",
    "completedAt": "2024-01-15T10:30:00Z",
    "attempts": 1,
    "notes": "Nailed the timing! Eggs were perfect."
  },
  "achievements": [
    {
      "id": "first-recipe",
      "name": "First Steps",
      "description": "Complete your first recipe",
      "points": 10,
      "earnedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### User Endpoints

#### PUT /users/profile
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "displayName": "Master Chef",
  "avatarUrl": "https://example.com/avatar.jpg",
  "preferences": {
    "dietary_restrictions": ["vegetarian", "gluten-free"],
    "cuisine_preferences": ["italian", "asian"],
    "cooking_time_preference": 30,
    "skill_focus": "flavor-building",
    "equipment": ["stand-mixer", "food-processor"]
  }
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "displayName": "Master Chef",
    "avatarUrl": "https://example.com/avatar.jpg",
    "preferences": { ... }
  }
}
```

#### GET /users/stats
Get detailed user statistics.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "stats": {
    "level": 3,
    "experience": 450,
    "totalRecipesCompleted": 8,
    "skillsMastered": 1,
    "currentStreak": 5,
    "longestStreak": 12,
    "totalCookingTime": "8 hours 30 minutes",
    "favoriteCuisine": "italian",
    "averageSessionLength": "45 minutes",
    "mostActiveDay": "sunday",
    "achievements": 6,
    "totalPoints": 285,
    "joinedAt": "2024-01-01T00:00:00Z",
    "lastActivityAt": "2024-01-15T08:30:00Z"
  }
}
```

### Cooking Sessions

#### POST /sessions
Start a new cooking session.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "recipeId": "boiled-egg",
  "notes": "Trying the 7-minute technique today"
}
```

**Response (201):**
```json
{
  "message": "Cooking session started",
  "session": {
    "id": 1,
    "recipeId": "boiled-egg",
    "startedAt": "2024-01-15T10:30:00Z",
    "notes": "Trying the 7-minute technique today",
    "status": "in_progress"
  }
}
```

#### PUT /sessions/:id
Update a cooking session.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "completed": true,
  "success": true,
  "difficultyRating": 3,
  "notes": "Perfect eggs! Timing was spot on.",
  "photos": ["https://example.com/photo1.jpg"]
}
```

**Response (200):**
```json
{
  "message": "Session updated successfully",
  "session": {
    "id": 1,
    "recipeId": "boiled-egg",
    "startedAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:45:00Z",
    "duration": 900, // seconds
    "success": true,
    "difficultyRating": 3,
    "notes": "Perfect eggs! Timing was spot on.",
    "photos": ["https://example.com/photo1.jpg"]
  }
}
```

---

## Python AI Service Endpoints

### Recommendation Endpoints

#### POST /recommendations/recipes
Get personalized recipe recommendations.

**Headers:** `Authorization: Bearer <service_token>`

**Request Body:**
```json
{
  "user_id": 1,
  "preferences": {
    "dietary_restrictions": ["vegetarian"],
    "max_cooking_time": 30,
    "difficulty_preference": "beginner"
  },
  "current_skills": ["basic-cooking"],
  "context": {
    "time_of_day": "evening",
    "equipment_available": ["stovetop", "oven"],
    "ingredients_on_hand": ["eggs", "rice"]
  }
}
```

**Response (200):**
```json
{
  "recommendations": [
    {
      "recipe_id": "make-rice",
      "title": "Perfect Rice",
      "confidence_score": 0.92,
      "recommendation_reasons": [
        "Matches your beginner skill level",
        "Uses ingredients you have available",
        "Builds on basic cooking skills"
      ],
      "estimated_success_rate": 0.87,
      "personalization_factors": ["skill_match", "ingredient_match", "time_match"]
    }
  ],
  "context": {
    "user_skill_level": "beginner",
    "primary_learning_goal": "basic-cooking",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "total_count": 5,
  "algorithm_version": "v2.1.0"
}
```

#### GET /recommendations/recipes/similar/:recipe_id
Find recipes similar to a specific recipe.

**Query Parameters:**
- `user_id`: User ID for personalization
- `similarity_type`: `content`, `collaborative`, or `hybrid`
- `limit`: Number of similar recipes (default: 5)

**Response (200):**
```json
{
  "base_recipe_id": "boiled-egg",
  "similar_recipes": [
    {
      "recipe_id": "scrambled-eggs",
      "title": "Fluffy Scrambled Eggs",
      "similarity_score": 0.85,
      "similarity_reasons": ["Same primary ingredient", "Similar skill level", "Comparable cooking time"]
    }
  ],
  "similarity_type": "content",
  "count": 3
}
```

### Tips Endpoints

#### POST /tips/generate
Generate a personalized cooking tip.

**Headers:** `Authorization: Bearer <service_token>`

**Request Body:**
```json
{
  "user_id": 1,
  "category": "technique",
  "skill_level": "beginner",
  "current_recipe_id": "boiled-egg",
  "context": {
    "cooking_step": "timing",
    "common_issues": ["overcooking", "difficult_peeling"]
  }
}
```

**Response (200):**
```json
{
  "tip": {
    "id": "tip_1234",
    "title": "Perfect Egg Timing",
    "content": "For consistently perfect boiled eggs, start your timer only when the water returns to a full rolling boil after adding the eggs. This ensures accurate timing regardless of your starting water temperature.",
    "category": "technique",
    "difficulty": "beginner",
    "tags": ["timing", "eggs", "consistency"],
    "estimated_helpfulness": 0.91
  },
  "context": {
    "recipe_id": "boiled-egg",
    "user_skill_level": "beginner"
  },
  "generated_at": "2024-01-15T10:30:00Z",
  "source": "ai_generated"
}
```

#### GET /tips/daily/:user_id
Get the daily personalized tip for a user.

**Response (200):**
```json
{
  "tip": {
    "id": "daily_tip_20240115",
    "title": "Sharp Knives Are Safer",
    "content": "A sharp knife requires less pressure and is less likely to slip, making it actually safer than a dull knife. Keep your knives properly sharpened and honed for better control and safety.",
    "category": "safety",
    "difficulty": "beginner",
    "tags": ["knife", "safety", "basics"],
    "source": "curated_content",
    "daily_tip_date": "2024-01-15"
  },
  "generated_at": "2024-01-15T10:30:00Z",
  "source": "daily_curated"
}
```

### Analysis Endpoints

#### POST /analysis/cooking-assessment
Analyze a cooking session and provide feedback.

**Headers:** `Authorization: Bearer <service_token>`

**Request Body:**
```json
{
  "user_id": 1,
  "recipe_id": "boiled-egg",
  "session_data": {
    "duration": 900,
    "success": true,
    "difficulty_rating": 3,
    "notes": "Eggs were perfect but took longer than expected",
    "photos": ["https://example.com/photo1.jpg"]
  },
  "analysis_type": "comprehensive"
}
```

**Response (200):**
```json
{
  "analysis": {
    "overall_assessment": "successful_completion",
    "skill_improvements": [
      {
        "skill": "timing",
        "current_level": "developing",
        "improvement_suggestions": ["Practice with a timer", "Visual cues for doneness"]
      }
    ],
    "technique_feedback": {
      "strengths": ["Good temperature control", "Proper ice bath technique"],
      "areas_for_improvement": ["Timing consistency", "Preparation efficiency"]
    },
    "next_steps": [
      {
        "recommendation": "Try the soft-boiled variation",
        "reason": "Build on your current egg-cooking success",
        "confidence": 0.88
      }
    ],
    "confidence_score": 0.85
  },
  "generated_at": "2024-01-15T10:45:00Z"
}
```

---

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "details": "Additional context (optional)",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/v1/endpoint",
  "method": "POST"
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **409**: Conflict (duplicate resource)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error

## Rate Limits

- **General API**: 100 requests per 15 minutes per IP
- **User-specific**: 1000 requests per hour per authenticated user
- **AI Service**: 50 requests per minute per service token

## Pagination

List endpoints support pagination with these query parameters:
- `page`: Page number (1-based, default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 24,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```