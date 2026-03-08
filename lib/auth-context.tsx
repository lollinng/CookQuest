'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { removeToken } from '@/lib/api/client'
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  getStoredUser,
  type AuthUser,
} from '@/lib/api/auth'

// ---- Context types ----

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isAllowed: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    username: string,
    password: string,
    displayName?: string
  ) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ---- Provider ----

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user
  const isAllowed = user?.is_allowed ?? false
  const isAdmin = user?.is_admin ?? false

  // Check for existing session on mount
  // With httpOnly cookies, we can't check for the token directly —
  // instead we call /auth/me and let the cookie be sent automatically.
  useEffect(() => {
    async function checkAuth() {
      // Try to restore from cached user first for faster initial render
      const cachedUser = getStoredUser()
      if (cachedUser) {
        setUser(cachedUser)
      }

      try {
        // Verify the session is still valid via httpOnly cookie.
        // getCurrentUser() also refreshes the cached user in localStorage.
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch {
        // Cookie is invalid/expired or no session — clear local cache
        removeToken() // Clean up any legacy localStorage token
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // apiLogin handles token + user storage internally
    const response = await apiLogin(email, password)
    setUser(response.user)
  }, [])

  const register = useCallback(
    async (
      email: string,
      username: string,
      password: string,
      displayName?: string
    ) => {
      // apiRegister handles token + user storage internally
      const response = await apiRegister(email, username, password, displayName)
      setUser(response.user)
    },
    []
  )

  const logout = useCallback(async () => {
    // apiLogout handles clearing token + cached user
    await apiLogout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAllowed,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ---- Hook ----

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
