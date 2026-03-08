'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChefHatIcon, LogOutIcon, Loader2Icon } from 'lucide-react';
import { useState } from 'react';

export function AccessBlockedScreen() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-orange-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <ChefHatIcon className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-orange-900">
            Hang Tight, Chef!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You&apos;re on the list! We&apos;re rolling out alpha access gradually.
            You&apos;ll get full access soon.
          </p>

          {user?.email && (
            <p className="text-sm text-muted-foreground">
              Signed in as{' '}
              <span className="font-medium text-foreground">{user.email}</span>
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            Questions? Email{' '}
            <a
              href="mailto:pratameshjadhav@gmail.com"
              className="font-medium text-orange-600 hover:text-orange-700 underline"
            >
              pratameshjadhav@gmail.com
            </a>
          </p>

          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full mt-2"
          >
            {isLoggingOut ? (
              <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <LogOutIcon className="h-4 w-4 mr-2" />
            )}
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
