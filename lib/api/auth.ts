/**
 * Auth API module for CookQuest.
 *
 * Handles registration, login, logout, and fetching the current user.
 * Tokens and user data are persisted in localStorage so they survive
 * page reloads.
 */

import { apiClient, setToken, removeToken } from '@/lib/api/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserProfile {
  display_name: string
  dietary_preferences: string[]
  skill_level: 'beginner' | 'intermediate' | 'advanced'
}

export interface AuthUser {
  id: number
  email: string
  username: string
  profile: UserProfile
  created_at?: string
  is_allowed: boolean
  is_admin: boolean
}

/** Shape returned by POST /auth/login and POST /auth/register */
export interface AuthResponse {
  user: AuthUser
  token: string
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
  displayName?: string
}

// ---------------------------------------------------------------------------
// Local user cache helpers
// ---------------------------------------------------------------------------

const USER_KEY = 'cookquest_user'

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Register a new account.
 *
 * On success the JWT token is saved to localStorage and the user object is
 * cached so subsequent `getStoredUser()` calls return immediately.
 */
export async function register(
  email: string,
  username: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const payload: RegisterPayload = { email, username, password }
  if (displayName) {
    payload.displayName = displayName
  }

  const data = await apiClient<AuthResponse>('/auth/register', {
    method: 'POST',
    body: payload,
    skipAuth: true,
  })

  setToken(data.token)
  setStoredUser(data.user)

  return data
}

/**
 * Log in with email and password.
 *
 * On success the JWT token is saved to localStorage and the user object is
 * cached locally.
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const data = await apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  })

  setToken(data.token)
  setStoredUser(data.user)

  return data
}

/**
 * Log out the current user.
 *
 * Calls the server-side logout endpoint (which invalidates the session) and
 * then clears all local auth state regardless of whether the server call
 * succeeds.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient<void>('/auth/logout', { method: 'POST' })
  } catch {
    // Server-side invalidation is best-effort -- always clear local state.
  } finally {
    removeToken()
    clearStoredUser()
  }
}

/**
 * Fetch the currently authenticated user from the server.
 *
 * Also refreshes the locally cached user data in localStorage.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const data = await apiClient<{ user: AuthUser }>('/auth/me')
  setStoredUser(data.user)
  return data.user
}
