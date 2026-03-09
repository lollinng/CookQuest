import { analyzeCVSignals, CVSignalResult } from './photo-cv-analysis';
import { analyzeMetaSignals, MetaAnalysisResult } from './photo-meta-analysis';
import { DatabaseService } from './database';
import { logger } from './logger';

export interface VerificationConfig {
  acceptThreshold: number;
  marginalThreshold: number;
  xp: { accepted: number; marginal: number; rejected: number };
}

export const DEFAULT_CONFIG: VerificationConfig = {
  acceptThreshold: parseInt(process.env.VERIFY_ACCEPT_THRESHOLD || '4', 10),
  marginalThreshold: parseInt(process.env.VERIFY_MARGINAL_THRESHOLD || '3', 10),
  xp: {
    accepted: parseInt(process.env.VERIFY_XP_ACCEPTED || '80', 10),
    marginal: parseInt(process.env.VERIFY_XP_MARGINAL || '40', 10),
    rejected: 0,
  },
};

export interface VerificationResult {
  signals: Array<{ name: string; score: number; passed: boolean; details: string }>;
  totalScore: number;
  maxScore: number;
  verdict: 'accepted' | 'marginal' | 'rejected';
  xpAwarded: number;
  processingMs: number;
  feedback: string;
  tips: string[];
  dhash: string | null;
}

const SIGNAL_TIPS: Record<string, string> = {
  color_diversity: 'Try photographing the full plate with garnishes visible',
  saturation_warmth: 'Natural lighting works best — avoid fluorescent lights',
  texture_variance: 'Get a close-up showing the texture of your dish',
  multi_region: 'Include the plate, utensils, or table for context',
  specular_highlights: 'A bit of natural light brings out the shine on sauces',
  circular_contours: 'Center your plate or bowl in the frame',
  exif_freshness: 'Take a fresh photo right after cooking',
  capture_context: 'Use the in-app camera for the best experience',
  session_context: 'Open the recipe first, then cook and photograph',
  file_metadata: 'Use a full-resolution photo, not a thumbnail or screenshot',
  near_duplicate: 'Each dish deserves its own unique photo!',
  trust_tier: 'Keep posting verified photos to build your trust level',
};

const VERDICT_FEEDBACK: Record<string, string> = {
  accepted: 'Photo verified! Great shot.',
  marginal: 'Photo accepted with reduced XP — see tips to improve next time.',
  rejected: 'Photo could not be verified. Check the tips below and try again.',
};

export async function verifyPhoto(
  imageBuffer: Buffer,
  file: { mimetype: string; size: number },
  userId: number,
  recipeId: string,
  headers: Record<string, string | undefined>,
  config: VerificationConfig = DEFAULT_CONFIG
): Promise<VerificationResult> {
  const start = Date.now();

  // Run CV and meta analysis in parallel
  const [cvResult, metaResult] = await Promise.all([
    analyzeCVSignals(imageBuffer),
    analyzeMetaSignals(imageBuffer, file, userId, recipeId, headers),
  ]);

  // Merge all signals
  const allSignals: Array<{ name: string; score: number; passed: boolean; details: string }> = [
    ...cvResult.signals,
    ...metaResult.signals,
  ];

  const passedCount = allSignals.filter(s => s.passed).length;
  const maxScore = allSignals.length;

  // Determine verdict
  let verdict: 'accepted' | 'marginal' | 'rejected';
  if (passedCount >= config.acceptThreshold) {
    verdict = 'accepted';
  } else if (passedCount >= config.marginalThreshold) {
    verdict = 'marginal';
  } else {
    verdict = 'rejected';
  }

  const xpAwarded = config.xp[verdict];

  // Generate tips from failed signals
  const tips = allSignals
    .filter(s => !s.passed && SIGNAL_TIPS[s.name])
    .map(s => SIGNAL_TIPS[s.name]);

  const processingMs = Date.now() - start;

  return {
    signals: allSignals,
    totalScore: passedCount,
    maxScore,
    verdict,
    xpAwarded,
    processingMs,
    feedback: VERDICT_FEEDBACK[verdict],
    tips,
    dhash: metaResult.dhash,
  };
}

/**
 * Run verification and persist the result. Returns the verification result.
 * On failure, returns a default 'accepted' result so uploads are never blocked.
 */
export async function verifyAndPersist(
  imageBuffer: Buffer,
  file: { mimetype: string; size: number },
  userId: number,
  recipeId: string,
  photoUrl: string | null,
  headers: Record<string, string | undefined>,
  config?: VerificationConfig
): Promise<VerificationResult> {
  try {
    const result = await verifyPhoto(imageBuffer, file, userId, recipeId, headers, config);

    // Persist verification record
    await DatabaseService.savePhotoVerification(
      userId, recipeId, photoUrl, result.dhash, result.signals, result.verdict
    );

    // Update trust tier
    const trustVerdict = result.verdict === 'rejected' ? 'rejected' : 'verified';
    await DatabaseService.updateTrustTier(userId, trustVerdict);

    return result;
  } catch (err) {
    logger.error({ err }, 'Photo verification failed — defaulting to accepted');
    return {
      signals: [],
      totalScore: 0,
      maxScore: 0,
      verdict: 'accepted',
      xpAwarded: DEFAULT_CONFIG.xp.accepted,
      processingMs: 0,
      feedback: 'Photo accepted.',
      tips: [],
      dhash: null,
    };
  }
}
