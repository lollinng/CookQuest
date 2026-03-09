/**
 * Centralized localStorage access for CookQuest.
 *
 * All non-auth localStorage keys should be accessed through this module.
 * Auth-related storage (token, user) is managed by lib/api/client.ts and lib/api/auth.ts.
 */

const KEYS = {
  PWA_DISMISS: 'cookquest-pwa-dismissed',
  VIEW_MODE: 'cookquest-skill-view-mode',
  ONBOARDING_SEEN: 'cookquest-onboarding-complete',
} as const

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

export const storage = {
  // PWA install prompt
  getPwaDismissed: (): boolean => {
    if (!isBrowser()) return false
    const val = localStorage.getItem(KEYS.PWA_DISMISS)
    if (!val) return false
    const dismissedAt = parseInt(val, 10)
    const sevenDays = 7 * 24 * 60 * 60 * 1000
    return Date.now() - dismissedAt < sevenDays
  },
  setPwaDismissed: (): void => {
    if (!isBrowser()) return
    localStorage.setItem(KEYS.PWA_DISMISS, Date.now().toString())
  },

  // Skill page view mode (learn/cookbook)
  getViewMode: (): string | null => {
    if (!isBrowser()) return null
    return localStorage.getItem(KEYS.VIEW_MODE)
  },
  setViewMode: (mode: string): void => {
    if (!isBrowser()) return
    localStorage.setItem(KEYS.VIEW_MODE, mode)
  },

  // Onboarding
  getOnboardingSeen: (): boolean => {
    if (!isBrowser()) return false
    return localStorage.getItem(KEYS.ONBOARDING_SEEN) === 'true'
  },
  setOnboardingSeen: (): void => {
    if (!isBrowser()) return
    localStorage.setItem(KEYS.ONBOARDING_SEEN, 'true')
  },
}

/**
 * Cache time strategy for TanStack Query hooks:
 *
 * | Data type             | staleTime | gcTime   | Rationale                          |
 * |-----------------------|-----------|----------|------------------------------------|
 * | User progress/profile | 1-2 min   | 5-10 min | Changes on each action             |
 * | Recipes/skills (list) | 5 min     | 10-15 min| Rarely changes, shared across users|
 * | Recipe detail          | 10 min    | 30 min   | Static content                     |
 * | Feed/social data      | 30 sec    | 2-5 min  | Real-time feel needed              |
 * | Tips                  | 0-1 hr    | 24 hr    | Rotational, not urgent             |
 * | Favorites             | 2 min     | 10 min   | User-specific, moderate churn      |
 */
export const CACHE_TIMES = {
  /** User-specific data that changes frequently */
  USER_DATA: { staleTime: 1 * 60 * 1000, gcTime: 5 * 60 * 1000 },
  /** Global recipe/skill lists */
  GLOBAL_LISTS: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  /** Individual recipe/skill details */
  DETAIL: { staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000 },
  /** Social feed, posts, comments */
  FEED: { staleTime: 30 * 1000, gcTime: 2 * 60 * 1000 },
  /** Tips (daily/random) */
  TIPS: { staleTime: 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000 },
  /** User favorites */
  FAVORITES: { staleTime: 2 * 60 * 1000, gcTime: 10 * 60 * 1000 },
} as const
