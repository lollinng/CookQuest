'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthDialog } from '@/components/auth/auth-dialog'
import {
  ChefHatIcon,
  LogOutIcon,
  UserIcon,
  ShieldIcon,
  Loader2Icon,
} from 'lucide-react'
import Link from 'next/link'

export function UserMenu() {
  const { user, isAuthenticated, isLoading, isAdmin, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      await logout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  // While the auth state is still loading, show a subtle placeholder
  if (isLoading) {
    return (
      <Button variant="ghost" size="icon" disabled className="rounded-full">
        <Loader2Icon className="h-4 w-4 animate-spin text-orange-500" />
      </Button>
    )
  }

  // Not logged in -- show Sign In button that opens the auth dialog
  if (!isAuthenticated || !user) {
    return <AuthDialog />
  }

  // Logged in -- show avatar + dropdown
  const displayName = user.profile?.display_name || user.username
  const initials = getInitials(displayName)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full ring-2 ring-orange-200 hover:ring-orange-400 transition-all"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 bg-white shadow-lg border" align="end" sideOffset={8}>
        {/* User info header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-orange-100 text-orange-700 font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-semibold leading-none text-orange-900">
                {displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Profile stats */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Your Journey
          </DropdownMenuLabel>
          <div className="px-2 py-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <ChefHatIcon className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">
                  Level {user.profile?.skill_level || 'Beginner'}
                </span>
              </div>
            </div>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Actions */}
        <DropdownMenuGroup>
          {isAdmin && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin">
                <ShieldIcon className="h-4 w-4" />
                <span>Admin Panel</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer">
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <Loader2Icon className="h-4 w-4 animate-spin" />
          ) : (
            <LogOutIcon className="h-4 w-4" />
          )}
          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---- Helpers ----

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
