import { Router, Response, NextFunction, Request } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth'
import { getStorageService } from '../services/storage'
import { logger } from '../services/logger'

const router = Router()

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

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

function buildPhotoProxyUrl(req: Request, filename: string): string {
  const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`
  return `${baseUrl}/api/v1/photos/${filename}`
}

// POST /api/v1/uploads/photo — General photo upload (not tied to a recipe)
router.post('/photo', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
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

    // Validate actual file content (magic bytes)
    if (!validateBufferContent(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ success: false, error: { message: 'File content does not match declared type' } })
    }

    const safeExt = MIME_TO_EXT[req.file.mimetype] || '.jpg'
    const baseFilename = `${crypto.randomUUID()}${safeExt}`

    // Resize with sharp
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

    // Upload via storage service
    const storage = getStorageService()
    await storage.upload(finalBuffer, filename, 'image/jpeg')

    const photoUrl = buildPhotoProxyUrl(req, filename)

    res.json({ success: true, data: { photoUrl } })
  } catch (error: any) {
    logger.error({ err: error }, 'General photo upload error')
    res.status(500).json({ success: false, error: { message: 'Upload failed' } })
  }
})

export const uploadRoutes = router
