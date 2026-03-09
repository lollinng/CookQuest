import { Router, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { DatabaseService } from '../services/database';
import { DEFAULT_CONFIG } from '../services/photo-verification';
import { logger } from '../services/logger';

const router = Router();

const MAX_DAILY_APPEALS = 3;
const MAX_REASON_LENGTH = 500;

// POST /api/v1/photos/appeals — Create an appeal (authenticated)
router.post('/appeals', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { verificationId, reason } = req.body;

    if (!verificationId || typeof verificationId !== 'number') {
      return res.status(400).json({ success: false, error: { message: 'verificationId is required (number)' } });
    }

    if (reason && typeof reason === 'string' && reason.length > MAX_REASON_LENGTH) {
      return res.status(400).json({ success: false, error: { message: `Reason must be under ${MAX_REASON_LENGTH} characters` } });
    }

    // Verify the verification exists and belongs to this user
    const verification = await DatabaseService.getVerificationById(verificationId);
    if (!verification || verification.user_id !== userId) {
      return res.status(404).json({ success: false, error: { message: 'Verification not found' } });
    }

    // Only marginal/rejected verdicts can be appealed
    if (verification.verdict === 'accepted') {
      return res.status(400).json({ success: false, error: { message: 'Cannot appeal an accepted verification' } });
    }

    // Check for existing pending appeal
    const hasPending = await DatabaseService.getPendingAppealForVerification(verificationId);
    if (hasPending) {
      return res.status(400).json({ success: false, error: { message: 'An appeal is already pending for this verification' } });
    }

    // Rate limit: max 3 appeals per day
    const dailyCount = await DatabaseService.getUserDailyAppealCount(userId);
    if (dailyCount >= MAX_DAILY_APPEALS) {
      return res.status(429).json({ success: false, error: { message: `Maximum ${MAX_DAILY_APPEALS} appeals per day` } });
    }

    const appeal = await DatabaseService.createAppeal(userId, verificationId, reason);

    res.status(201).json({
      success: true,
      data: { id: appeal.id, status: appeal.status, createdAt: appeal.created_at },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Create appeal error');
    res.status(500).json({ success: false, error: { message: 'Failed to create appeal' } });
  }
});

// GET /api/v1/photos/appeals/mine — Get user's appeals (authenticated)
router.get('/appeals/mine', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const appeals = await DatabaseService.getUserAppeals(userId);

    res.json({
      success: true,
      data: {
        appeals: appeals.map(a => ({
          id: a.id,
          verificationId: a.verification_id,
          reason: a.reason,
          status: a.status,
          createdAt: a.created_at,
          verdict: a.verdict,
          score: a.passed_count,
        })),
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Get appeals error');
    res.status(500).json({ success: false, error: { message: 'Failed to fetch appeals' } });
  }
});

// PATCH /api/v1/admin/appeals/:id — Resolve an appeal (admin only)
router.patch('/admin/appeals/:id', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const appealId = parseInt(req.params.id, 10);
    const adminId = req.user!.id;
    const { status } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Status must be "approved" or "denied"' } });
    }

    if (isNaN(appealId)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid appeal ID' } });
    }

    const { appeal, previousVerdict } = await DatabaseService.resolveAppeal(appealId, adminId, status);

    if (!appeal) {
      return res.status(404).json({ success: false, error: { message: 'Appeal not found or already resolved' } });
    }

    // On approval: update verdict, award missing XP, update trust tier
    if (status === 'approved') {
      await DatabaseService.updateVerificationVerdict(appeal.verification_id, 'accepted');

      // Award missing XP
      const info = await DatabaseService.getVerificationRecipeInfo(appeal.verification_id);
      if (info) {
        let missingXp = 0;
        if (previousVerdict === 'rejected') {
          missingXp = DEFAULT_CONFIG.xp.accepted;
        } else if (previousVerdict === 'marginal') {
          missingXp = DEFAULT_CONFIG.xp.accepted - DEFAULT_CONFIG.xp.marginal;
        }

        if (missingXp > 0) {
          await DatabaseService.awardXP(info.user_id, 'appeal_approved', missingXp, `recipe:${info.recipe_id}`);
        }

        // Update trust tier
        await DatabaseService.updateTrustTier(info.user_id, 'verified');

        // Recalculate progression
        const recipe = await DatabaseService.getRecipeById(info.recipe_id);
        if (recipe?.skill) {
          const photoCount = await DatabaseService.getPhotoCountForSkill(info.user_id, recipe.skill);
          await DatabaseService.getNewlyUnlockedRecipes(info.user_id, recipe.skill, photoCount - 1);
        }
      }
    }

    res.json({
      success: true,
      data: { id: appeal.id, status: appeal.status, reviewedAt: appeal.reviewed_at },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Resolve appeal error');
    res.status(500).json({ success: false, error: { message: 'Failed to resolve appeal' } });
  }
});

// GET /api/v1/admin/verification-stats — Admin verification stats
router.get('/admin/verification-stats', authMiddleware, adminMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await DatabaseService.getVerificationStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error({ err: error }, 'Get verification stats error');
    res.status(500).json({ success: false, error: { message: 'Failed to fetch stats' } });
  }
});

export { router as appealRoutes };
