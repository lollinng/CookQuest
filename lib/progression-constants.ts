/**
 * Progression constants for the cook-to-unlock system.
 *
 * These mirror the backend skill configuration defaults. The backend is
 * authoritative — these are used for optimistic UI calculations and fallback
 * when the progression API is unavailable.
 */

export const PROGRESSION = {
  /** Recipes freely available before gating kicks in */
  INITIAL_FREE_RECIPES: 3,
  /** Additional recipes unlocked per photo posted */
  RECIPES_PER_UNLOCK: 2,
  /** Photos in current skill required to unlock next skill */
  PHOTOS_FOR_NEXT_SKILL: 3,
  /** Minimum time (ms) recipe must be open before posting allowed (anti-cheat) */
  MIN_COOK_TIME_MS: 5 * 60 * 1000,

  XP: {
    RECIPE_COMPLETE: 50,
    PHOTO_POST: 80,
    RECEIVE_LIKE: 5,
    RECEIVE_COMMENT: 10,
  },

  /** Skills where all recipes are free (no gating) */
  UNGATED_SKILLS: ['basic-cooking'] as const,
} as const;
