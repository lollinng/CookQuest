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
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2Icon, ChefHatIcon } from 'lucide-react'

interface RegisterFormProps {
  onSwitchToLogin?: () => void
  onSuccess?: () => void
  embedded?: boolean
}

interface FormErrors {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  general?: string
}

export function RegisterForm({ onSwitchToLogin, onSuccess, embedded = false }: RegisterFormProps) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address.'
    }

    if (!username.trim()) {
      newErrors.username = 'Username is required.'
    } else if (username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      newErrors.username = 'Only letters, numbers, hyphens, and underscores.'
    }

    if (!password) {
      newErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      await register(email.trim(), username.trim(), password)
      onSuccess?.()
    } catch (err: any) {
      setErrors({
        general: err?.message || 'Registration failed. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.general}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          placeholder="chef@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          required
        />
        {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-username">Username</Label>
        <Input
          id="register-username"
          type="text"
          placeholder="masterchef42"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          disabled={isSubmitting}
          aria-invalid={!!errors.username}
          required
        />
        {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          required
        />
        {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="register-confirm-password">Confirm Password</Label>
        <Input
          id="register-confirm-password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.confirmPassword}
          required
        />
        {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
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
            Creating account...
          </>
        ) : (
          'Create Account'
        )}
      </Button>

      {onSwitchToLogin && (
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-medium text-orange-600 hover:text-orange-700 hover:underline"
          >
            Sign In
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
          Join CookQuest
        </CardTitle>
        <CardDescription>
          Create an account and start your cooking adventure
        </CardDescription>
      </CardHeader>
      <CardContent>{formBody}</CardContent>
    </Card>
  )
}
