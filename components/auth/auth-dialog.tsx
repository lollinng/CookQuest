'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { ChefHatIcon } from 'lucide-react'

type AuthView = 'login' | 'register'

interface AuthDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultView?: AuthView
  trigger?: React.ReactNode
}

export function AuthDialog({
  open,
  onOpenChange,
  defaultView = 'login',
  trigger,
}: AuthDialogProps) {
  const [view, setView] = useState<AuthView>(defaultView)

  function handleSuccess() {
    onOpenChange?.(false)
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setView(defaultView)
    }
    onOpenChange?.(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <ChefHatIcon className="h-4 w-4" />
            Sign In
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="theme-light sm:max-w-[420px] p-0 border-orange-200/50 overflow-hidden gap-0 bg-white">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {view === 'login' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
          <DialogDescription>
            {view === 'login'
              ? 'Sign in to your CookQuest account'
              : 'Create a new CookQuest account'}
          </DialogDescription>
        </DialogHeader>

        {/* Header with icon */}
        <div className="text-center pt-6 pb-2 px-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
            <ChefHatIcon className="h-7 w-7 text-orange-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {view === 'login' ? 'Welcome Back' : 'Join CookQuest'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {view === 'login'
              ? 'Sign in to continue your cooking journey'
              : 'Create an account to track your progress'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex mx-6 mt-4 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setView('login')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'login'
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setView('register')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              view === 'register'
                ? 'bg-white text-orange-700 shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form content */}
        <div className="p-6">
          {view === 'login' ? (
            <LoginForm
              embedded
              onSwitchToRegister={() => setView('register')}
              onSuccess={handleSuccess}
            />
          ) : (
            <RegisterForm
              embedded
              onSwitchToLogin={() => setView('login')}
              onSuccess={handleSuccess}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
