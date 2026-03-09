/**
 * Progression API module for CookQuest.
 *
 * Provides typed wrappers around the /progression and /badges endpoints.
 * All endpoints require authentication.
 */

import { apiClient } from '@/lib/api/client';
import type { SkillProgression, Badge } from '@/lib/types';

// ---------------------------------------------------------------------------
// Skill Progression
// ---------------------------------------------------------------------------

/**
 * Fetch gating/progression status for a single skill.
 *
 * Returns which recipes are unlocked, how many photos the user has posted,
 * and how many more are needed to unlock the next batch.
 */
export async function getSkillProgression(skillId: string): Promise<SkillProgression> {
  return apiClient<SkillProgression>(`/skills/${encodeURIComponent(skillId)}/progression`);
}

/**
 * Fetch progression overview for all skills at once.
 *
 * Useful for the home/dashboard to show overall gating status.
 */
export async function getProgressionOverview(): Promise<SkillProgression[]> {
  return apiClient<SkillProgression[]>('/progression/overview');
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's earned badges.
 */
export async function getUserBadges(): Promise<Badge[]> {
  return apiClient<Badge[]>('/badges');
}

/**
 * Fetch all available badges with the user's earned status.
 */
export async function getAvailableBadges(): Promise<Badge[]> {
  return apiClient<Badge[]>('/badges/available');
}
