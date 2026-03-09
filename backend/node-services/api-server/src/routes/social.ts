import { Router, Response, Request, NextFunction } from 'express'
import { body, param, query } from 'express-validator'
import multer from 'multer'
import { DatabaseService } from '../services/database'
import { getStorageService } from '../services/storage'
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'
import { logger } from '../services/logger'

const router = Router()

const userIdValidation = param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
const searchValidation = query('q').isString().isLength({ min: 1, max: 100 }).withMessage('Search query required (1-100 chars)')

// ── Notifications (must be before /users/:id to avoid param collision) ──

// GET /api/v1/notifications?limit=30 — Get user's notifications
router.get('/notifications',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 30, 1), 50)
    const notifications = await DatabaseService.getNotifications(userId, limit)

    res.json({
      success: true,
      data: notifications.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        actorId: n.actor_id,
        actorUsername: n.actor_username,
        actorDisplayName: n.actor_display_name,
        actorAvatarUrl: n.actor_avatar_url,
        type: n.type,
        postId: n.post_id,
        postCaption: n.post_caption,
        isRead: n.is_read,
        createdAt: n.created_at,
      }))
    })
  })
)

// GET /api/v1/notifications/unread-count — Get unread count for badge
router.get('/notifications/unread-count',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const count = await DatabaseService.getUnreadNotificationCount(req.user!.id)
    res.json({ success: true, data: { count } })
  })
)

// PATCH /api/v1/notifications/read-all — Mark all notifications read
router.patch('/notifications/read-all',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await DatabaseService.markAllNotificationsRead(req.user!.id)
    res.json({ success: true })
  })
)

// PATCH /api/v1/notifications/:id/read — Mark single notification read
router.patch('/notifications/:id/read',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const notificationId = parseInt(req.params.id, 10)
    await DatabaseService.markNotificationRead(notificationId, req.user!.id)
    res.json({ success: true })
  })
)

// ── Leaderboard ──

// GET /api/v1/leaderboard/world?limit=10 — Top users globally by recipes completed
router.get('/leaderboard/world',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 10, 1), 50)
    const rows = await DatabaseService.getWorldLeaderboard(limit)
    res.json({
      success: true,
      data: rows.map((r: any, i: number) => ({
        rank: i + 1,
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        recipesCompleted: r.recipes_completed,
      }))
    })
  })
)

// GET /api/v1/leaderboard/friends?limit=10 — Top users among followed + self
router.get('/leaderboard/friends',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 10, 1), 50)
    const rows = await DatabaseService.getFriendsLeaderboard(userId, limit)
    res.json({
      success: true,
      data: rows.map((r: any, i: number) => ({
        rank: i + 1,
        id: r.id,
        username: r.username,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        recipesCompleted: r.recipes_completed,
      }))
    })
  })
)

// POST /api/v1/users/:id/follow — Follow a user
router.post('/users/:id/follow',
  authMiddleware,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const followerId = req.user!.id
    const followingId = parseInt(req.params.id, 10)

    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot follow yourself' }
      })
    }

    // Check target user exists
    const target = await DatabaseService.getUserById(followingId)
    if (!target) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      })
    }

    // Check if already following
    const already = await DatabaseService.isFollowing(followerId, followingId)
    if (already) {
      return res.status(409).json({
        success: false,
        error: { message: 'Already following this user' }
      })
    }

    await DatabaseService.followUser(followerId, followingId)
    await DatabaseService.createNotification(followingId, followerId, 'follow')

    res.json({
      success: true,
      data: { following: true }
    })
  })
)

// DELETE /api/v1/users/:id/follow — Unfollow a user
router.delete('/users/:id/follow',
  authMiddleware,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const followerId = req.user!.id
    const followingId = parseInt(req.params.id, 10)

    const removed = await DatabaseService.unfollowUser(followerId, followingId)
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: { message: 'Not following this user' }
      })
    }

    res.json({
      success: true,
      data: { following: false }
    })
  })
)

// GET /api/v1/users/:id/followers — List user's followers
router.get('/users/:id/followers',
  optionalAuth,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10)
    const currentUserId = req.user?.id

    const followers = await DatabaseService.getFollowers(userId, currentUserId)

    res.json({
      success: true,
      data: followers.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        isFollowing: u.is_following,
      }))
    })
  })
)

// GET /api/v1/users/:id/following — List who user follows
router.get('/users/:id/following',
  optionalAuth,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10)
    const currentUserId = req.user?.id

    const following = await DatabaseService.getFollowing(userId, currentUserId)

    res.json({
      success: true,
      data: following.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        isFollowing: u.is_following,
      }))
    })
  })
)

// GET /api/v1/users/search?q=term — Search users
router.get('/users/search',
  optionalAuth,
  validateRequest([searchValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const q = req.query.q as string
    const currentUserId = req.user?.id

    const users = await DatabaseService.searchUsers(q, currentUserId)

    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        followersCount: u.followers_count,
        followingCount: u.following_count,
        isFollowing: u.is_following,
      }))
    })
  })
)

// GET /api/v1/users/:id — Public user profile
router.get('/users/:id',
  optionalAuth,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10)
    const currentUserId = req.user?.id

    const profile = await DatabaseService.getPublicProfile(userId, currentUserId)
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      })
    }

    res.json({
      success: true,
      data: {
        id: profile.id,
        uuid: profile.uuid,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        followersCount: profile.followers_count,
        followingCount: profile.following_count,
        totalRecipesCompleted: profile.total_recipes_completed,
        isFollowing: profile.is_following,
      }
    })
  })
)

// ── Skill Trophies ──

const SKILL_META: Record<string, { name: string; icon: string; color: string }> = {
  'basic-cooking': { name: 'Basic Cooking', icon: '🥚', color: '#F59E0B' },
  'heat-control': { name: 'Heat Control', icon: '🔥', color: '#EF4444' },
  'flavor-building': { name: 'Flavor Building', icon: '🧂', color: '#8B5CF6' },
  'air-fryer': { name: 'Air Fryer', icon: '💨', color: '#3B82F6' },
  'indian-cuisine': { name: 'Indian Cuisine', icon: '🍛', color: '#10B981' },
}

// GET /api/v1/users/:id/skill-trophies — Skill completion data for profile
router.get('/users/:id/skill-trophies',
  optionalAuth,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10)

    // Check user exists
    const user = await DatabaseService.getUserById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      })
    }

    const rows = await DatabaseService.getUserSkillTrophies(userId)

    // Build trophies from DB rows, ensure all 5 skills are present
    const rowMap = new Map(rows.map((r: any) => [r.skill_id, r]))
    const trophies = Object.entries(SKILL_META).map(([skillId, meta]) => {
      const row = rowMap.get(skillId)
      const completed = row?.completed ?? 0
      const total = row?.total ?? 0
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      return {
        skillId,
        skillName: meta.name,
        icon: meta.icon,
        color: meta.color,
        completed,
        total,
        percentage,
        mastered: percentage === 100 && total > 0,
      }
    })

    res.json({
      success: true,
      data: trophies
    })
  })
)

// Helper to map DB row → UserPost shape
function mapPost(row: any) {
  // Parse photos: could be JSON array from subquery, or empty
  let photos: string[] = []
  if (Array.isArray(row.photos)) {
    photos = row.photos.filter(Boolean)
  } else if (typeof row.photos === 'string') {
    try { photos = JSON.parse(row.photos).filter(Boolean) } catch { /* ignore */ }
  }
  // Fallback: if photos empty but photoUrl exists, use it
  if (photos.length === 0 && row.photo_url) {
    photos = [row.photo_url]
  }

  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    postType: row.post_type,
    recipeId: row.recipe_id,
    recipeTitle: row.recipe_title,
    recipeImageUrl: row.recipe_image_url,
    photoUrl: row.photo_url,
    photos,
    caption: row.caption,
    commentsCount: row.comments_count || 0,
    likesCount: row.likes_count || 0,
    isLiked: row.is_liked || false,
    createdAt: row.created_at,
  }
}

// GET /api/v1/feed/world?limit=30&difficulty=beginner — Latest posts from all users
router.get('/feed/world',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 30, 1), 50)
    const difficulty = req.query.difficulty as string | undefined
    const posts = await DatabaseService.getWorldFeed(userId, limit, difficulty)

    res.json({
      success: true,
      data: posts.map(mapPost)
    })
  })
)

// GET /api/v1/feed?limit=30 — Activity feed from followed users
router.get('/feed',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 30, 1), 50)
    const posts = await DatabaseService.getFeed(userId, limit)

    res.json({
      success: true,
      data: posts.map(mapPost)
    })
  })
)

// POST /api/v1/posts — Create a post
router.post('/posts',
  authMiddleware,
  validateRequest([
    body('postType').isIn(['recipe_completed', 'photo_upload', 'milestone']).withMessage('Invalid post type'),
    body('recipeId').optional().isString(),
    body('photoUrl').optional().isString(),
    body('caption').optional().isString().trim().isLength({ max: 500 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const { postType, recipeId, photoUrl, caption } = req.body

    const post = await DatabaseService.createPost(userId, postType, recipeId, photoUrl, caption)

    res.status(201).json({
      success: true,
      data: post
    })
  })
)

// GET /api/v1/users/:id/posts — User's recent posts (for profile page)
router.get('/users/:id/posts',
  optionalAuth,
  validateRequest([userIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = parseInt(req.params.id, 10)
    const posts = await DatabaseService.getUserPosts(userId)

    res.json({
      success: true,
      data: posts.map(mapPost)
    })
  })
)

// ── Post Comments ──

const postIdValidation = param('postId').isInt({ min: 1 }).withMessage('Invalid post ID')
const commentIdValidation = param('commentId').isInt({ min: 1 }).withMessage('Invalid comment ID')

// DELETE /api/v1/posts/:postId — Delete own post
router.delete('/posts/:postId',
  authMiddleware,
  validateRequest([postIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postId = parseInt(req.params.postId, 10)
    const userId = req.user!.id

    const result = await DatabaseService.deletePost(postId, userId)
    if (result === 'not_found') {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' }
      })
    }
    if (result === 'forbidden') {
      return res.status(403).json({
        success: false,
        error: { message: 'Cannot delete another user\'s post' }
      })
    }

    res.status(204).send()
  })
)

// POST /api/v1/posts/:postId/comments — Add a comment
router.post('/posts/:postId/comments',
  authMiddleware,
  validateRequest([
    postIdValidation,
    body('content').isString().trim().isLength({ min: 1, max: 500 }).withMessage('Content required (1-500 chars)'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postId = parseInt(req.params.postId, 10)
    const userId = req.user!.id
    const { content } = req.body

    const post = await DatabaseService.getPostById(postId)
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' }
      })
    }

    const comment = await DatabaseService.addComment(postId, userId, content.trim())

    res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        postId: comment.post_id,
        userId: comment.user_id,
        username: comment.username,
        displayName: comment.display_name,
        avatarUrl: comment.avatar_url,
        content: comment.content,
        createdAt: comment.created_at,
      }
    })
  })
)

// GET /api/v1/posts/:postId/comments — Get comments for a post
router.get('/posts/:postId/comments',
  authMiddleware,
  validateRequest([postIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postId = parseInt(req.params.postId, 10)

    const post = await DatabaseService.getPostById(postId)
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' }
      })
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 100)
    const currentUserId = req.user?.id
    const comments = await DatabaseService.getComments(postId, limit, currentUserId)

    res.json({
      success: true,
      data: comments.map(c => ({
        id: c.id,
        postId: c.post_id,
        userId: c.user_id,
        username: c.username,
        displayName: c.display_name,
        avatarUrl: c.avatar_url,
        content: c.content,
        likesCount: c.likes_count,
        isLiked: c.is_liked,
        createdAt: c.created_at,
      }))
    })
  })
)

// DELETE /api/v1/posts/:postId/comments/:commentId — Delete own comment
router.delete('/posts/:postId/comments/:commentId',
  authMiddleware,
  validateRequest([postIdValidation, commentIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postId = parseInt(req.params.postId, 10)
    const commentId = parseInt(req.params.commentId, 10)
    const userId = req.user!.id

    const post = await DatabaseService.getPostById(postId)
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' }
      })
    }

    try {
      const deleted = await DatabaseService.deleteComment(commentId, userId)
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: { message: 'Comment not found' }
        })
      }
    } catch (err: any) {
      if (err.message === 'FORBIDDEN') {
        return res.status(403).json({
          success: false,
          error: { message: 'Cannot delete another user\'s comment' }
        })
      }
      throw err
    }

    res.json({ success: true })
  })
)

// POST /api/v1/posts/:postId/like — Toggle like on a post
router.post('/posts/:postId/like',
  authMiddleware,
  validateRequest([postIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const postId = parseInt(req.params.postId, 10)
    const userId = req.user!.id

    const post = await DatabaseService.getPostById(postId)
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' }
      })
    }

    const result = await DatabaseService.togglePostLike(postId, userId)

    if (result.liked) {
      await DatabaseService.createNotification(post.user_id, userId, 'post_like', postId)
    }

    res.json({
      success: true,
      data: result
    })
  })
)

// POST /api/v1/posts/:postId/comments/:commentId/like — Toggle like on a comment
router.post('/posts/:postId/comments/:commentId/like',
  authMiddleware,
  validateRequest([postIdValidation, commentIdValidation]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const commentId = parseInt(req.params.commentId, 10)
    const userId = req.user!.id

    // Verify comment exists and belongs to the post
    const postId = parseInt(req.params.postId, 10)
    const post = await DatabaseService.getPostById(postId)
    if (!post) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found' }
      })
    }

    const result = await DatabaseService.toggleCommentLike(commentId, userId)

    res.json({
      success: true,
      data: result
    })
  })
)

// ── Avatar Upload ──

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
}

function validateBufferContent(buffer: Buffer, declaredMime: string): boolean {
  const patterns = MAGIC_BYTES[declaredMime]
  if (!patterns) return false
  return patterns.some(pattern =>
    pattern.every((byte, i) => buffer[i] === byte)
  )
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'))
    }
  },
})

function buildPhotoProxyUrl(req: Request, filename: string): string {
  const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`
  return `${baseUrl}/api/v1/photos/${filename}`
}

// PATCH /api/v1/users/me/avatar — Upload or replace avatar
router.patch('/users/me/avatar', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: { message: err.message } })
    }
    if (err) {
      return res.status(400).json({ success: false, error: { message: err.message || 'Upload error' } })
    }
    next()
  })
}, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: { message: 'No avatar file provided' } })
    }

    const userId = req.user!.id

    // Validate magic bytes
    if (!validateBufferContent(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ success: false, error: { message: 'File content does not match declared type' } })
    }

    const safeExt = MIME_TO_EXT[req.file.mimetype] || '.jpg'
    const filename = `avatar-${userId}-${Date.now()}${safeExt}`

    // Resize with sharp
    let finalBuffer = req.file.buffer
    let finalFilename = filename
    try {
      const sharp = await import('sharp')
      finalBuffer = await sharp.default(req.file.buffer)
        .resize({ width: 400, height: 400, fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer()
      finalFilename = filename.replace(/\.\w+$/, '.jpg')
    } catch (sharpErr) {
      logger.warn({ err: sharpErr }, 'Sharp resize failed for avatar, keeping original')
    }

    // Delete old avatar from storage if exists
    const oldAvatarUrl = await DatabaseService.getUserAvatarUrl(userId)
    if (oldAvatarUrl) {
      const oldFilename = oldAvatarUrl.split('/photos/').pop()
      if (oldFilename) {
        try {
          const storage = getStorageService()
          await storage.delete(oldFilename)
        } catch (delErr) {
          logger.warn({ err: delErr }, 'Failed to delete old avatar from storage')
        }
      }
    }

    // Upload new avatar
    const storage = getStorageService()
    await storage.upload(finalBuffer, finalFilename, 'image/jpeg')

    const avatarUrl = buildPhotoProxyUrl(req, finalFilename)
    await DatabaseService.updateUserAvatar(userId, avatarUrl)

    res.json({
      success: true,
      data: { avatarUrl }
    })
  } catch (error: any) {
    logger.error({ err: error }, 'Avatar upload error')
    res.status(500).json({ success: false, error: { message: 'Avatar upload failed' } })
  }
})

// DELETE /api/v1/users/me/avatar — Remove avatar
router.delete('/users/me/avatar', authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id

    // Get current avatar URL to delete from storage
    const oldAvatarUrl = await DatabaseService.getUserAvatarUrl(userId)
    if (oldAvatarUrl) {
      const oldFilename = oldAvatarUrl.split('/photos/').pop()
      if (oldFilename) {
        try {
          const storage = getStorageService()
          await storage.delete(oldFilename)
        } catch (delErr) {
          logger.warn({ err: delErr }, 'Failed to delete avatar from storage')
        }
      }
    }

    await DatabaseService.clearUserAvatar(userId)

    res.json({ success: true, data: { avatarUrl: null } })
  })
)

export { router as socialRoutes }
