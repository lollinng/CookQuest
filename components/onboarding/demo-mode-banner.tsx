'use client';

import Link from 'next/link';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoModeBannerProps {
  title: string;
  subtitle: string;
}

export function DemoModeBanner({ title, subtitle }: DemoModeBannerProps) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5">
      <div className="flex items-start gap-3">
        <ChefHat className="mt-0.5 size-6 shrink-0 text-amber-400" />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/onboarding">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-cq-primary-hover"
              >
                Sign Up
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                variant="outline"
                className="border-border text-foreground"
              >
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
