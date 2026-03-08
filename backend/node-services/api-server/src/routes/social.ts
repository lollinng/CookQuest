import { Router, Response } from 'express'
import { body, param, query } from 'express-validator'
import { DatabaseService } from '../services/database'
import { authMiddleware, optionalAuth, AuthenticatedRequest } from '../middleware/auth'
import { validateRequest } from '../middleware/validation'
import { asyncHandler } from '../middleware/error-handler'

const router = Router()

const userIdValidation = param('id').isInt({ min: 1 }).withMessage('Invalid user ID')
const searchValidation = query('q').isString().isLength({ min: 1, max: 100 }).withMessage('Search query required (1-100 chars)')

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

// Helper to map DB row → UserPost shape
function mapPost(row: any) {
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
    caption: row.caption,
    commentsCount: row.comments_count || 0,
    createdAt: row.created_at,
  }
}

// GET /api/v1/feed — Activity feed from followed users
router.get('/feed',
  authMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id
    const posts = await DatabaseService.getFeed(userId)

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
    const comments = await DatabaseService.getComments(postId, limit)

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

export { router as socialRoutes }
