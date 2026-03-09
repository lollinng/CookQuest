import sharp from 'sharp'
import { DatabaseService } from './database'
import { logger } from './logger'

export interface MetaSignalResult {
  name: string;
  score: number;      // 0.0 - 1.0
  passed: boolean;
  details: string;
}

export interface MetaAnalysisResult {
  signals: MetaSignalResult[];
  passedCount: number;
  dhash: string | null;
}

const PASS_THRESHOLD = 0.5;

// --- Signal 1: EXIF freshness ---
async function analyzeExifFreshness(buffer: Buffer): Promise<MetaSignalResult> {
  try {
    const metadata = await sharp(buffer).metadata()
    const exif = metadata.exif

    if (!exif) {
      return { name: 'exif_freshness', score: 0.3, passed: false, details: 'No EXIF data found' }
    }

    // Try to extract DateTimeOriginal from raw EXIF buffer
    const exifStr = exif.toString('binary')
    const dateMatch = exifStr.match(/(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)

    if (!dateMatch) {
      return { name: 'exif_freshness', score: 0.3, passed: false, details: 'No EXIF timestamp found' }
    }

    const [, year, month, day, hour, minute, second] = dateMatch
    const photoDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
    const now = new Date()
    const hoursAgo = (now.getTime() - photoDate.getTime()) / (1000 * 60 * 60)

    if (hoursAgo < 24) {
      return { name: 'exif_freshness', score: 1.0, passed: true, details: `Photo taken ${Math.round(hoursAgo)}h ago` }
    }
    if (hoursAgo < 24 * 7) {
      return { name: 'exif_freshness', score: 0.7, passed: true, details: `Photo taken ${Math.round(hoursAgo / 24)}d ago` }
    }
    return { name: 'exif_freshness', score: 0.3, passed: false, details: `Photo taken ${Math.round(hoursAgo / 24)}d ago (>7d)` }
  } catch {
    return { name: 'exif_freshness', score: 0.3, passed: false, details: 'Failed to read EXIF' }
  }
}

// --- Signal 2: Capture context ---
function analyzeCaptureContext(headers: Record<string, string | undefined>): MetaSignalResult {
  const source = headers['x-cq-capture-source']

  if (source === 'in-app-camera') {
    return { name: 'capture_context', score: 1.0, passed: true, details: 'In-app camera capture' }
  }
  if (source === 'gallery') {
    return { name: 'capture_context', score: 0.5, passed: true, details: 'Gallery upload' }
  }
  return { name: 'capture_context', score: 0.3, passed: false, details: 'No capture source header' }
}

// --- Signal 3: Session context ---
async function analyzeSessionContext(userId: number, recipeId: string): Promise<MetaSignalResult> {
  const hasRecentView = await DatabaseService.getRecentRecipeView(userId, recipeId)
  if (hasRecentView) {
    return { name: 'session_context', score: 1.0, passed: true, details: 'Recipe viewed within 30 min' }
  }
  return { name: 'session_context', score: 0.2, passed: false, details: 'No recent recipe view' }
}

// --- Signal 4: File metadata ---
async function analyzeFileMetadata(
  buffer: Buffer,
  file: { mimetype: string; size: number }
): Promise<MetaSignalResult> {
  try {
    const metadata = await sharp(buffer).metadata()
    const width = metadata.width || 0
    const height = metadata.height || 0
    const size = file.size

    let failCount = 0
    const issues: string[] = []

    if (width < 400 || height < 400) {
      failCount++
      issues.push(`too small (${width}x${height})`)
    }
    if (size < 50 * 1024) {
      failCount++
      issues.push(`file too small (${Math.round(size / 1024)}KB)`)
    }
    const aspect = width / Math.max(height, 1)
    if (aspect < 0.5 || aspect > 2.0) {
      failCount++
      issues.push(`extreme aspect ratio (${aspect.toFixed(2)})`)
    }

    if (failCount === 0) {
      return { name: 'file_metadata', score: 1.0, passed: true, details: `${width}x${height}, ${Math.round(size / 1024)}KB` }
    }
    if (failCount === 1) {
      return { name: 'file_metadata', score: 0.5, passed: true, details: issues.join(', ') }
    }
    return { name: 'file_metadata', score: 0.1, passed: false, details: issues.join(', ') }
  } catch {
    return { name: 'file_metadata', score: 0.1, passed: false, details: 'Failed to read image metadata' }
  }
}

// --- Signal 5: Near-duplicate detection (dHash) ---
export async function computeDHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  let hash = ''
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const left = data[y * 9 + x]
      const right = data[y * 9 + x + 1]
      hash += left < right ? '1' : '0'
    }
  }
  return hash // 64-bit binary string
}

function hammingDistance(a: string, b: string): number {
  let dist = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist
}

async function analyzeNearDuplicate(buffer: Buffer, userId: number, dhash: string): Promise<MetaSignalResult> {
  try {
    const existingHashes = await DatabaseService.getUserPhotoHashes(userId)

    for (const existing of existingHashes) {
      if (hammingDistance(dhash, existing) < 5) {
        return { name: 'near_duplicate', score: 0.0, passed: false, details: 'Duplicate photo detected' }
      }
    }
    return { name: 'near_duplicate', score: 1.0, passed: true, details: 'No duplicates found' }
  } catch {
    return { name: 'near_duplicate', score: 0.5, passed: true, details: 'Could not check duplicates' }
  }
}

// --- Signal 6: Trust tier bonus ---
async function getTrustTierBonus(userId: number): Promise<MetaSignalResult> {
  const { tier, verified_count } = await DatabaseService.getUserTrustTier(userId)

  if (tier === 'veteran') {
    return { name: 'trust_tier', score: 1.0, passed: true, details: `Veteran (${verified_count} verified)` }
  }
  if (tier === 'trusted') {
    return { name: 'trust_tier', score: 1.0, passed: true, details: `Trusted (${verified_count} verified)` }
  }
  return { name: 'trust_tier', score: 0.0, passed: false, details: `New user (${verified_count} verified)` }
}

// --- Main analysis orchestrator ---
export async function analyzeMetaSignals(
  imageBuffer: Buffer,
  file: { mimetype: string; size: number },
  userId: number,
  recipeId: string,
  headers: Record<string, string | undefined>
): Promise<MetaAnalysisResult> {
  let dhash: string | null = null
  try {
    dhash = await computeDHash(imageBuffer)
  } catch (err) {
    logger.warn({ err }, 'Failed to compute dHash')
  }

  const signals = await Promise.all([
    analyzeExifFreshness(imageBuffer),
    Promise.resolve(analyzeCaptureContext(headers)),
    analyzeSessionContext(userId, recipeId),
    analyzeFileMetadata(imageBuffer, file),
    dhash
      ? analyzeNearDuplicate(imageBuffer, userId, dhash)
      : Promise.resolve({ name: 'near_duplicate', score: 0.5, passed: true, details: 'dHash unavailable' } as MetaSignalResult),
    getTrustTierBonus(userId),
  ])

  const passedCount = signals.filter(s => s.passed).length

  return { signals, passedCount, dhash }
}
