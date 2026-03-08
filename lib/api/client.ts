/**
 * Base API client for CookQuest backend.
 *
 * Wraps the native fetch API with:
 * - Automatic credential inclusion (httpOnly cookies)
 * - JSON request/response serialization
 * - Unwrapping of the { success, data } response envelope
 * - Structured error handling that mirrors the backend error format
 * - Token refresh on 401 responses (single retry, de-duplicated)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003/api/v1'

if (
  typeof window !== 'undefined' &&
  !process.env.NEXT_PUBLIC_API_URL &&
  window.location.protocol === 'https:'
) {
  console.warn(
    '[CookQuest] NEXT_PUBLIC_API_URL is not set — using localhost fallback. ' +
    'This will not work in production. Set NEXT_PUBLIC_API_URL at build time.'
  );
}

// ---------------------------------------------------------------------------
// Token helpers — kept for backward compatibility but cookies are primary
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'cookquest_token'

/** @deprecated Use httpOnly cookies instead. Kept for migration compatibility. */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/** @deprecated Use httpOnly cookies instead. Kept for migration compatibility. */
export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number
  errors?: Array<{ field: string; message: string }>

  constructor(
    message: string,
    status: number,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

/** Successful response envelope returned by the backend. */
export interface ApiSuccessResponse<T> {
  success: true
  message?: string
  data: T
}

/** Error response envelope returned by the backend. */
export interface ApiErrorResponse {
  success: false
  error: {
    message: string
    errors?: Array<{ field: string; message: string }>
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

// ---------------------------------------------------------------------------
// Request options
// ---------------------------------------------------------------------------

export interface ApiClientOptions {
  method?: string
  /** Will be JSON.stringify-ed and sent as the request body. */
  body?: unknown
  /** Extra headers merged on top of the defaults. */
  headers?: Record<string, string>
  /** Query params -- appended to the URL as a search string. */
  params?: Record<string, string | number | undefined>
  /**
   * When true the Authorization header is omitted even if a token exists.
   * Useful for public endpoints like login / register.
   */
  skipAuth?: boolean
  /** Passed through to the underlying `fetch` call. */
  signal?: AbortSignal
  /** Request timeout in milliseconds. Defaults to 15000 (15s). */
  timeout?: number
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Low-level fetch wrapper used by every domain-specific API module.
 *
 * Returns only the **unwrapped `data`** field from the backend response
 * envelope so callers never need to check `success` themselves.
 *
 * Throws `ApiError` when the backend responds with `success: false` or when
 * the HTTP status indicates failure.
 */
export async function apiClient<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders,
    params,
    skipAuth = false,
    signal: externalSignal,
    timeout = 15000,
  } = options

  // Combine caller's signal with a timeout signal
  const timeoutSignal = AbortSignal.timeout(timeout)
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutSignal])
    : timeoutSignal

  // -- Build URL with optional query params --
  let url = `${API_BASE_URL}${endpoint}`
  if (params) {
    const filtered = Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== ''
    )
    if (filtered.length > 0) {
      const search = new URLSearchParams(
        filtered.map(([k, v]) => [k, String(v)])
      )
      url += `?${search.toString()}`
    }
  }

  // -- Build headers --
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders ?? {}),
  }

  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  // -- Execute fetch --
  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
    credentials: 'include', // Send httpOnly cookies with every request
  })

  // -- Handle 204 No Content --
  if (response.status === 204) {
    return undefined as T
  }

  // -- Handle non-JSON responses --
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError(
        `Server error: ${response.statusText}`,
        response.status
      )
    }
    return {} as T
  }

  const json: ApiResponse<T> = await response.json()

  // -- Success path: unwrap { success: true, data: T } --
  if (json.success) {
    return json.data
  }

  // -- 401: attempt a single token refresh, then retry --
  if (response.status === 401 && !skipAuth && getToken()) {
    const refreshed = await attemptTokenRefresh()
    if (refreshed) {
      return apiClient<T>(endpoint, options)
    }
    // Refresh failed -- wipe the stale token so the UI can redirect to login
    removeToken()
  }

  // -- Error path --
  const errorBody = json as ApiErrorResponse
  throw new ApiError(
    errorBody.error?.message ?? 'An unexpected error occurred',
    response.status,
    errorBody.error?.errors
  )
}

// ---------------------------------------------------------------------------
// Token refresh (de-duplicated so concurrent 401s share a single call)
// ---------------------------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const token = getToken()
      if (!token) return false

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      })

      if (!res.ok) return false

      const json = await res.json()
      if (json.success && json.data?.token) {
        setToken(json.data.token)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
