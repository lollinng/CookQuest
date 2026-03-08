import { Router, Response, NextFunction, Request } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { DatabaseService } from '../services/database'
import { getStorageService } from '../services/storage'
import { logger } from '../services/logger'

const router = Router()

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_USER_UPLOADS = 50 // Max photos per user

// Map MIME types to safe extensions (never trust client-provided extensions)
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

// Use memory storage — buffer goes to GCS or local disk via StorageService
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as typeof ALLOWED_MIME_TYPES[number])) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'))
    }
  },
})

// Validate actual file content via magic bytes (not just MIME header which can be spoofed)
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
}

function validateBufferContent(buffer: Buffer, declaredMime: string): boolean {
  const patterns = MAGIC_BYTES[declaredMime]
  if (!patterns) return false
  return patterns.some(pattern =>
    pattern.every((byte, i) => buffer[i] === byte)
  )
}

/** Build the proxy URL for a photo filename */
function buildPhotoProxyUrl(req: Request, filename: string): string {
  const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`
  return `${baseUrl}/api/v1/photos/${filename}`
}

/** Rewrite a stored photo_url to use the proxy if it's a direct GCS URL */
function rewritePhotoUrl(req: Request, photo: { photo_url: string; storage_key?: string | null }): string {
  if (photo.storage_key) {
    return buildPhotoProxyUrl(req, photo.storage_key)
  }
  // Fallback: extract filename from GCS URL
  const gcsMatch = photo.photo_url.match(/storage\.googleapis\.com\/[^/]+\/(.+)$/)
  if (gcsMatch) {
    return buildPhotoProxyUrl(req, gcsMatch[1])
  }
  return photo.photo_url
}

// ── Public endpoint: serve photos via proxy ──
// GET /api/v1/photos/:filename
// No auth required — photos are semi-public (UUID filenames are unguessable)
router.get('/photos/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params

  // Strict filename validation — prevent path traversal
  // Accepts: UUID-based names (r-{uuid}.ext) and avatar names (avatar-{userId}-{timestamp}.ext)
  if (!/^(r?-?[a-f0-9-]+|avatar-\d+-\d+)\.(jpg|jpeg|png|webp)$/.test(filename)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid filename' } })
  }

  try {
    const storage = getStorageService()
    const stream = await storage.stream(filename)

    const ext = filename.split('.').pop()
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
    stream.pipe(res)
  } catch (err: any) {
    if (err.code === 404 || err.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: { message: 'Photo not found' } })
    }
    logger.error({ err, filename }, 'Photo stream error')
    res.status(500).json({ success: false, error: { message: 'Failed to serve photo' } })
  }
})

// ── Protected endpoints below ──

// POST /api/v1/recipes/:id/photos
router.post('/recipes/:id/photos', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  upload.single('photo')(req, res, (err) => {
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
      return res.status(400).json({ success: false, error: { message: 'No photo uploaded' } })
    }

    const userId = req.user!.id
    const recipeId = req.params.id

    // Validate recipe ID format
    if (!/^[a-z0-9][a-z0-9-]{2,49}$/.test(recipeId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid recipe ID format' } })
    }

    // Validate actual file content (magic bytes) — don't trust MIME header alone
    if (!validateBufferContent(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ success: false, error: { message: 'File content does not match declared type' } })
    }

    // Enforce per-user upload limit
    const existingPhotos = await DatabaseService.getUserRecipePhotos(userId)
    if (existingPhotos.length >= MAX_USER_UPLOADS) {
      return res.status(400).json({ success: false, error: { message: `Upload limit reached (max ${MAX_USER_UPLOADS} photos)` } })
    }

    const safeExt = MIME_TO_EXT[req.file.mimetype] || '.jpg'
    const baseFilename = `${crypto.randomUUID()}${safeExt}`

    // Resize with sharp — operate on buffer
    let finalBuffer = req.file.buffer
    let filename = baseFilename
    try {
      const sharp = await import('sharp')
      finalBuffer = await sharp.default(req.file.buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()
      filename = `r-${baseFilename}`
    } catch (sharpErr) {
      logger.warn({ err: sharpErr }, 'Sharp resize failed, keeping original')
    }

    // Upload via storage service (GCS or local disk)
    const storage = getStorageService()
    await storage.upload(finalBuffer, filename, 'image/jpeg')

    // Store proxy URL (not direct GCS URL) so photos always serve through our API
    const photoUrl = buildPhotoProxyUrl(req, filename)

    await DatabaseService.upsertRecipePhoto(userId, recipeId, photoUrl, filename)

    // Create a feed post for the photo upload (idempotent — skip if one already exists)
    const hasPost = await DatabaseService.hasPhotoUploadPost(userId, recipeId)
    if (!hasPost) {
      await DatabaseService.createPost(userId, 'photo_upload', recipeId, photoUrl, undefined)
    }

    res.json({ success: true, data: { photo_url: photoUrl, recipe_id: recipeId } })
  } catch (error: any) {
    logger.error({ err: error }, 'Photo upload error')
    res.status(500).json({ success: false, error: { message: 'Upload failed' } })
  }
})

// GET /api/v1/users/me/photos
router.get('/users/me/photos', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const photos = await DatabaseService.getUserRecipePhotos(userId)

    // Rewrite any old direct GCS URLs to use the proxy
    const rewritten = photos.map(p => ({
      ...p,
      photo_url: rewritePhotoUrl(req, p),
    }))

    res.json({ success: true, data: { photos: rewritten } })
  } catch (error: any) {
    logger.error({ err: error }, 'Get photos error')
    res.status(500).json({ success: false, error: { message: 'Failed to fetch photos' } })
  }
})

// DELETE /api/v1/recipes/:id/photos
router.delete('/recipes/:id/photos', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const recipeId = req.params.id
    const deleted = await DatabaseService.deleteRecipePhoto(userId, recipeId)

    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Photo not found' } })
    }

    if (deleted.storageKey) {
      const storage = getStorageService()
      await storage.delete(deleted.storageKey)
    }

    res.status(204).send()
  } catch (error: any) {
    logger.error({ err: error }, 'Photo delete error')
    res.status(500).json({ success: false, error: { message: 'Delete failed' } })
  }
})

export { router as photoRoutes }
