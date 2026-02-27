import { Router, Response, NextFunction, Request } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { mkdirSync } from 'fs'
import fs from 'fs/promises'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { DatabaseService } from '../services/database'
import { logger } from '../services/logger'

const router = Router()
router.use(authMiddleware)

const uploadsDir = path.join(process.cwd(), 'uploads')
try { mkdirSync(uploadsDir, { recursive: true }) } catch (_) {}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_USER_UPLOADS = 50 // Max photos per user

// Map MIME types to safe extensions (never trust client-provided extensions)
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req: any, file, cb) => {
    // Use cryptographic random UUID — never trust user-provided filenames
    const safeExt = MIME_TO_EXT[file.mimetype] || '.jpg'
    cb(null, `${crypto.randomUUID()}${safeExt}`)
  },
})

const upload = multer({
  storage,
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

async function validateFileContent(filePath: string, declaredMime: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r')
    const buffer = Buffer.alloc(8)
    await fd.read(buffer, 0, 8, 0)
    await fd.close()

    const patterns = MAGIC_BYTES[declaredMime]
    if (!patterns) return false

    return patterns.some(pattern =>
      pattern.every((byte, i) => buffer[i] === byte)
    )
  } catch {
    return false
  }
}

// POST /api/v1/recipes/:id/photos
router.post('/recipes/:id/photos', (req: Request, res: Response, next: NextFunction) => {
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
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(400).json({ success: false, error: { message: 'Invalid recipe ID format' } })
    }

    // Validate actual file content (magic bytes) — don't trust MIME header alone
    const isValidContent = await validateFileContent(req.file.path, req.file.mimetype)
    if (!isValidContent) {
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(400).json({ success: false, error: { message: 'File content does not match declared type' } })
    }

    // Enforce per-user upload limit
    const existingPhotos = await DatabaseService.getUserRecipePhotos(userId)
    if (existingPhotos.length >= MAX_USER_UPLOADS) {
      await fs.unlink(req.file.path).catch(() => {})
      return res.status(400).json({ success: false, error: { message: `Upload limit reached (max ${MAX_USER_UPLOADS} photos)` } })
    }

    let filename = req.file.filename

    // Resize with sharp — delete original if resize fails
    try {
      const sharp = await import('sharp')
      const resizedFilename = `r-${filename}`
      const resizedPath = path.join(uploadsDir, resizedFilename)
      await sharp.default(req.file.path)
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(resizedPath)
      await fs.unlink(req.file.path)
      filename = resizedFilename
    } catch (sharpErr) {
      // If sharp fails, keep the original but log the error
      logger.warn({ err: sharpErr }, 'Sharp resize failed, keeping original')
    }

    const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3003}`
    const photoUrl = `${baseUrl}/uploads/${filename}`

    await DatabaseService.upsertRecipePhoto(userId, recipeId, photoUrl, filename)

    res.json({ success: true, data: { photo_url: photoUrl, recipe_id: recipeId } })
  } catch (error: any) {
    // Clean up uploaded file on error
    if (req.file) await fs.unlink(req.file.path).catch(() => {})
    logger.error({ err: error }, 'Photo upload error')
    res.status(500).json({ success: false, error: { message: 'Upload failed' } })
  }
})

// GET /api/v1/users/me/photos
router.get('/users/me/photos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const photos = await DatabaseService.getUserRecipePhotos(userId)
    res.json({ success: true, data: { photos } })
  } catch (error: any) {
    logger.error({ err: error }, 'Get photos error')
    res.status(500).json({ success: false, error: { message: 'Failed to fetch photos' } })
  }
})

// DELETE /api/v1/recipes/:id/photos
router.delete('/recipes/:id/photos', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const recipeId = req.params.id
    const deleted = await DatabaseService.deleteRecipePhoto(userId, recipeId)

    if (!deleted) {
      return res.status(404).json({ success: false, error: { message: 'Photo not found' } })
    }

    if (deleted.storageKey) {
      await fs.unlink(path.join(uploadsDir, deleted.storageKey)).catch(() => {})
    }

    res.status(204).send()
  } catch (error: any) {
    logger.error({ err: error }, 'Photo delete error')
    res.status(500).json({ success: false, error: { message: 'Delete failed' } })
  }
})

export { router as photoRoutes }
