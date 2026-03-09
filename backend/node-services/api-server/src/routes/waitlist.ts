import { Router } from 'express';
import crypto from 'crypto';
import { body, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { DatabaseService } from '../services/database';
import { validateRequest } from '../middleware/validation';
import { asyncHandler, APIError } from '../middleware/error-handler';
import { validateEmail } from '../utils/email-validation';
import { sendVerificationEmail, EmailLimitError, getDailyEmailStats } from '../services/email';
import { logger } from '../services/logger';

const router = Router();

// Rate limit: 10 requests per IP per 60 minutes
const waitlistLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests. Please try again later.' },
  },
  handler: (req, res, _next, options) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Waitlist rate limit exceeded');
    res.status(429).json(options.message);
  },
});

// POST /api/v1/waitlist/signup
router.post('/signup',
  waitlistLimiter,
  validateRequest([
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Validate email (format, MX records, disposable check)
    const validation = await validateEmail(email);
    if (!validation.valid) {
      throw new APIError(validation.reason || 'Invalid email address.', 400);
    }

    // Check if already verified
    const existing = await DatabaseService.getWaitlistEntry(email);
    if (existing && existing.verified) {
      throw new APIError('This email is already verified on the waitlist.', 409);
    }

    // Check recent signup count for this email (max 3 per hour)
    const recentCount = await DatabaseService.getRecentSignupCount(email, 60);
    if (recentCount >= 3) {
      throw new APIError('Too many verification attempts. Please try again later.', 429);
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete existing unused tokens for this email
    await DatabaseService.deleteUnusedTokensForEmail(email);

    // Create new token
    await DatabaseService.createVerificationToken(email, token, expiresAt);

    // Upsert waitlist entry
    await DatabaseService.upsertWaitlistEntry(
      email,
      req.ip || undefined,
      req.get('User-Agent') || undefined
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, token);
    } catch (err) {
      if (err instanceof EmailLimitError) {
        // Daily Gmail limit (500/day) reached — tell user to try later
        const stats = getDailyEmailStats();
        logger.warn({ email, stats }, 'Daily email limit hit during waitlist signup');
        throw new APIError(
          'We\'ve hit our daily email limit. Please try again tomorrow — your spot is saved!',
          503
        );
      }
      // Other email errors — log but don't expose details
      logger.error({ err, email }, 'Failed to send waitlist verification email');
      throw new APIError(
        'We couldn\'t send the verification email right now. Please try again in a few minutes.',
        503
      );
    }

    res.json({
      success: true,
      data: { message: 'Verification email sent. Check your inbox.' },
    });
  })
);

// GET /api/v1/waitlist/verify
router.get('/verify',
  validateRequest([
    query('token')
      .notEmpty()
      .withMessage('Token is required'),
  ]),
  asyncHandler(async (req, res) => {
    const { token } = req.query as { token: string };
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Look up token
    const tokenRecord = await DatabaseService.getVerificationToken(token);
    if (!tokenRecord) {
      return res.redirect(`${appUrl}/waitlist/verify?status=invalid`);
    }

    // Mark token used
    await DatabaseService.markTokenUsed(token);

    // Verify waitlist entry
    await DatabaseService.verifyWaitlistEntry(tokenRecord.email);

    return res.redirect(`${appUrl}/waitlist/verify?status=success`);
  })
);

export { router as waitlistRoutes };
