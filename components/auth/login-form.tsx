'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2Icon, ChefHatIcon } from 'lucide-react'

interface LoginFormProps {
  onSwitchToRegister?: () => void
  onSuccess?: () => void
  embedded?: boolean
}

export function LoginForm({ onSwitchToRegister, onSuccess, embedded = false }: LoginFormProps) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setIsSubmitting(true)
    try {
      await login(email.trim(), password)
      onSuccess?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="chef@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          disabled={isSubmitting}
          required
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        disabled={isSubmitting}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>

      {onSwitchToRegister && (
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-orange-600 hover:text-orange-700 hover:underline"
          >
            Register
          </button>
        </p>
      )}
    </form>
  )

  if (embedded) {
    return formBody
  }

  return (
    <Card className="w-full max-w-md border-orange-200/50 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
          <ChefHatIcon className="h-6 w-6 text-orange-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-orange-900">
          Welcome Back
        </CardTitle>
        <CardDescription>
          Sign in to continue your cooking journey
        </CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  )
}
