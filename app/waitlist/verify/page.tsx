'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle, XCircle, Loader2, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function LoadingState() {
  return (
    <div className="text-center space-y-4 py-4">
      <Loader2 className="size-16 text-amber-500 mx-auto animate-spin" />
      <p className="text-stone-500">Verifying...</p>
    </div>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  if (status === 'success') {
    return (
      <div className="text-center space-y-4 py-4">
        <CheckCircle className="size-16 text-green-500 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-stone-800">
            You&apos;re on the waitlist!
          </h2>
          <p className="text-stone-500">
            We&apos;ll notify you when CookQuest launches.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="text-center space-y-4 py-4">
        <XCircle className="size-16 text-red-500 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-stone-800">
            Invalid Link
          </h2>
          <p className="text-stone-500">
            This verification link is expired or invalid.
          </p>
        </div>
        <Link href="/waitlist">
          <Button className="bg-amber-500 hover:bg-amber-600 text-white">
            Back to Waitlist
          </Button>
        </Link>
      </div>
    );
  }

  return <LoadingState />;
}

export default function VerifyPage() {
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

        <Suspense fallback={<LoadingState />}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
