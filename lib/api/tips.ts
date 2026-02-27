/**
 * Tips API module for CookQuest.
 *
 * Provides typed wrappers around the /tips endpoints.
 * These endpoints are public and do not require authentication.
 */

import { apiClient } from '@/lib/api/client'
import type { CookingTip } from '@/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by GET /tips/random */
export interface RandomTipResponse {
  tip: CookingTip
}

/** Shape returned by GET /tips/daily */
export interface DailyTipResponse {
  tip: CookingTip
  date: string
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a single random cooking tip.
 *
 * The backend applies a short cache (5 min) so the same tip may be returned
 * for rapid successive calls.
 */
export async function getRandomTip(): Promise<CookingTip> {
  const data = await apiClient<RandomTipResponse>('/tips/random', {
    params: { _t: String(Date.now()) },
  })
  return data.tip
}

/**
 * Fetch the daily cooking tip.
 *
 * The backend deterministically selects one tip per calendar day so every
 * user sees the same tip on the same day.
 */
export async function getDailyTip(): Promise<DailyTipResponse> {
  return apiClient<DailyTipResponse>('/tips/daily')
}
