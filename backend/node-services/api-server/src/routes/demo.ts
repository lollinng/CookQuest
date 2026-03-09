import { Router, Response, Request } from 'express'
import { DatabaseService } from '../services/database'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

// ── Sample data for unauthenticated visitors ──

const SAMPLE_FEED = [
  {
    id: 'demo-1',
    type: 'recipe_completed',
    userId: 0,
    username: 'maya_cooks',
    displayName: 'Maya Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&fit=crop&q=80',
    recipeTitle: 'Perfect Scrambled Eggs',
    caption: 'Finally nailed the creamy texture! Low heat is the secret.',
    photoUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&fit=crop&q=80',
    xpEarned: 50,
    likes: 12,
    comments: 3,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: 'demo-2',
    type: 'photo_upload',
    userId: 0,
    username: 'raj_kitchen',
    displayName: 'Raj Patel',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80',
    recipeTitle: 'Chicken Tikka Masala',
    caption: 'Week 3 of the Indian plan and already cooking like my grandma!',
    photoUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&fit=crop&q=80',
    xpEarned: 75,
    likes: 24,
    comments: 7,
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString()
  },
  {
    id: 'demo-3',
    type: 'milestone',
    userId: 0,
    username: 'sophie_bakes',
    displayName: 'Sophie Laurent',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&fit=crop&q=80',
    recipeTitle: null,
    caption: 'Just hit Level 5 in Basic Cooking! 🎉',
    photoUrl: null,
    xpEarned: 0,
    likes: 18,
    comments: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  },
  {
    id: 'demo-4',
    type: 'recipe_completed',
    userId: 0,
    username: 'carlos_eats',
    displayName: 'Carlos Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&fit=crop&q=80',
    recipeTitle: 'Garlic Butter Steak',
    caption: 'Medium-rare perfection. The sear was incredible.',
    photoUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&fit=crop&q=80',
    xpEarned: 100,
    likes: 31,
    comments: 9,
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'demo-5',
    type: 'photo_upload',
    userId: 0,
    username: 'aisha_nom',
    displayName: 'Aisha Johnson',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop&q=80',
    recipeTitle: 'Dal Tadka',
    caption: 'Comfort food at its finest. The tempering changed everything.',
    photoUrl: 'https://images.unsplash.com/photo-1626500154744-e4b394ffea16?w=600&fit=crop&q=80',
    xpEarned: 60,
    likes: 15,
    comments: 4,
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString()
  },
  {
    id: 'demo-6',
    type: 'recipe_completed',
    userId: 0,
    username: 'kevin_wok',
    displayName: 'Kevin Ng',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop&q=80',
    recipeTitle: 'Air Fryer Crispy Tofu',
    caption: 'So crispy without deep frying. Game changer!',
    photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&fit=crop&q=80',
    xpEarned: 65,
    likes: 20,
    comments: 6,
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString()
  },
  {
    id: 'demo-7',
    type: 'milestone',
    userId: 0,
    username: 'priya_spice',
    displayName: 'Priya Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&fit=crop&q=80',
    recipeTitle: null,
    caption: 'Completed the entire Indian Cuisine skill tree! 🏆',
    photoUrl: null,
    xpEarned: 0,
    likes: 42,
    comments: 11,
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  },
  {
    id: 'demo-8',
    type: 'photo_upload',
    userId: 0,
    username: 'emma_plates',
    displayName: 'Emma Wilson',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&fit=crop&q=80',
    recipeTitle: 'Pasta Aglio e Olio',
    caption: 'Simple ingredients, maximum flavor. The pasta water is key!',
    photoUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&fit=crop&q=80',
    xpEarned: 55,
    likes: 27,
    comments: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString()
  }
]

const SAMPLE_PEOPLE = [
  {
    id: 0,
    username: 'maya_cooks',
    displayName: 'Maya Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&fit=crop&q=80',
    skillLevel: 'intermediate',
    recipesCompleted: 23,
    totalXp: 1840,
    streakDays: 12
  },
  {
    id: 0,
    username: 'raj_kitchen',
    displayName: 'Raj Patel',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&fit=crop&q=80',
    skillLevel: 'advanced',
    recipesCompleted: 47,
    totalXp: 4200,
    streakDays: 30
  },
  {
    id: 0,
    username: 'sophie_bakes',
    displayName: 'Sophie Laurent',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&fit=crop&q=80',
    skillLevel: 'beginner',
    recipesCompleted: 8,
    totalXp: 520,
    streakDays: 5
  },
  {
    id: 0,
    username: 'carlos_eats',
    displayName: 'Carlos Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&fit=crop&q=80',
    skillLevel: 'intermediate',
    recipesCompleted: 31,
    totalXp: 2650,
    streakDays: 18
  },
  {
    id: 0,
    username: 'priya_spice',
    displayName: 'Priya Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&fit=crop&q=80',
    skillLevel: 'advanced',
    recipesCompleted: 52,
    totalXp: 5100,
    streakDays: 45
  },
  {
    id: 0,
    username: 'kevin_wok',
    displayName: 'Kevin Ng',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop&q=80',
    skillLevel: 'beginner',
    recipesCompleted: 11,
    totalXp: 780,
    streakDays: 7
  }
]

// GET /api/v1/demo/feed — Sample activity feed (no auth)
router.get('/feed',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: SAMPLE_FEED })
  })
)

// GET /api/v1/demo/people — Sample user profiles (no auth)
router.get('/people',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({ success: true, data: SAMPLE_PEOPLE })
  })
)

// GET /api/v1/demo/favorites — Random recipes from DB (no auth)
router.get('/favorites',
  asyncHandler(async (_req: Request, res: Response) => {
    const rows = await DatabaseService.all(
      'SELECT id, title, description, skill, difficulty, time, image_url, emoji, xp_reward FROM recipes ORDER BY RANDOM() LIMIT 4',
      []
    )

    const favorites = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      skill: r.skill,
      difficulty: r.difficulty,
      time: r.time,
      imageUrl: r.image_url,
      emoji: r.emoji,
      xpReward: r.xp_reward
    }))

    res.json({ success: true, data: favorites })
  })
)

export const demoRoutes = router
