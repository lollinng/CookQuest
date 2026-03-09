'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Loader2, Mail, ChefHat } from 'lucide-react';
import { signupForWaitlist } from '@/lib/api/waitlist';

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const validateEmail = (value: string) => {
    if (!value) {
      setValidationError('Email is required');
      return false;
    }
    if (!isValidEmail(value)) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleBlur = () => {
    if (email) {
      validateEmail(email);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setFormState('loading');
    setErrorMessage('');

    try {
      await signupForWaitlist(email);
      setSubmittedEmail(email);
      setFormState('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setFormState('error');
    }
  };

  const handleRetry = () => {
    setFormState('idle');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <ChefHat className="size-8 text-amber-500" />
            <h1 className="text-3xl font-bold text-stone-800">CookQuest</h1>
          </div>
          <p className="text-stone-500">Level up your cooking skills</p>
        </div>

        {formState === 'success' ? (
          /* Success State */
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="size-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-stone-800">Check your email!</h2>
              <p className="text-stone-500">
                We sent a verification link to{' '}
                <span className="font-medium text-stone-700">{submittedEmail}</span>.
              </p>
            </div>
          </div>
        ) : (
          /* Form State */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (validationError) validateEmail(e.target.value);
                  }}
                  onBlur={handleBlur}
                  disabled={formState === 'loading'}
                  className="pl-10"
                  aria-label="Email address"
                  aria-invalid={!!validationError}
                />
              </div>
              {validationError && (
                <p className="text-sm text-red-500">{validationError}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={formState === 'loading'}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {formState === 'loading' ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join the Waitlist'
              )}
            </Button>

            {formState === 'error' && (
              <div className="space-y-2 text-center">
                <p className="text-sm text-red-500">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="text-sm text-amber-600 hover:text-amber-700 underline underline-offset-2"
                >
                  Try Again
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
