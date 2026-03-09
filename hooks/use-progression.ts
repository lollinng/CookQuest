'use client';

import { useQuery } from '@tanstack/react-query';
import type { SkillProgression, Badge, SkillType } from '@/lib/types';
import { getSkillProgression, getProgressionOverview, getUserBadges, getAvailableBadges } from '@/lib/api/progression';
import { PROGRESSION } from '@/lib/progression-constants';
import { getToken } from '@/lib/api/client';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const progressionKeys = {
  all: ['progression'] as const,
  skill: (skillId: string) => [...progressionKeys.all, 'skill', skillId] as const,
  overview: () => [...progressionKeys.all, 'overview'] as const,
  badges: () => [...progressionKeys.all, 'badges'] as const,
  badgesAvailable: () => [...progressionKeys.all, 'badges', 'available'] as const,
};

// ---------------------------------------------------------------------------
// Fallback generator — all recipes unlocked (used when API unavailable)
// ---------------------------------------------------------------------------

function buildFallbackProgression(skillId: SkillType): SkillProgression {
  return {
    skillId,
    totalRecipes: 0,
    unlockedCount: 0,
    photosPosted: 0,
    photosNeededForNextUnlock: 0,
    photosNeededForNextSkill: 0,
    nextUnlockAt: 0,
    recipes: [],
  };
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch progression/gating status for a single skill.
 *
 * Falls back to "all unlocked" if the API is unavailable or the user
 * is not authenticated, so the app never breaks during backend rollout.
 */
export function useSkillProgression(skillId: SkillType | undefined) {
  return useQuery({
    queryKey: progressionKeys.skill(skillId ?? ''),
    queryFn: async (): Promise<SkillProgression> => {
      if (!skillId || !getToken()) {
        return buildFallbackProgression(skillId ?? 'basic-cooking');
      }
      try {
        return await getSkillProgression(skillId);
      } catch {
        // Graceful fallback — treat all recipes as unlocked
        return buildFallbackProgression(skillId);
      }
    },
    enabled: !!skillId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch progression overview for all skills.
 *
 * Falls back to an empty array if the API is unavailable.
 */
export function useProgressionOverview() {
  return useQuery({
    queryKey: progressionKeys.overview(),
    queryFn: async (): Promise<SkillProgression[]> => {
      if (!getToken()) return [];
      try {
        return await getProgressionOverview();
      } catch {
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch the authenticated user's earned badges.
 */
export function useUserBadges() {
  return useQuery({
    queryKey: progressionKeys.badges(),
    queryFn: async (): Promise<Badge[]> => {
      if (!getToken()) return [];
      try {
        return await getUserBadges();
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * Fetch all available badges with earned status.
 */
export function useAvailableBadges() {
  return useQuery({
    queryKey: progressionKeys.badgesAvailable(),
    queryFn: async (): Promise<Badge[]> => {
      if (!getToken()) return [];
      try {
        return await getAvailableBadges();
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * Derived helper — check if a specific recipe is unlocked within a skill.
 *
 * Returns true if:
 * - The skill is ungated (e.g. basic-cooking)
 * - The progression data hasn't loaded yet (optimistic — don't block UI)
 * - The recipe is explicitly marked as unlocked
 */
export function useIsRecipeUnlocked(
  skillId: string | undefined,
  recipeId: string | undefined,
  progression: SkillProgression | undefined
): boolean {
  if (!skillId || !recipeId) return true;

  // Ungated skills — all recipes are always unlocked
  if ((PROGRESSION.UNGATED_SKILLS as readonly string[]).includes(skillId)) {
    return true;
  }

  // No progression data yet — optimistically unlock to avoid flicker
  if (!progression || progression.recipes.length === 0) {
    return true;
  }

  const recipe = progression.recipes.find((r) => r.recipeId === recipeId);
  return recipe?.isUnlocked ?? true;
}
