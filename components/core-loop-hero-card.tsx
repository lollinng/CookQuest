'use client';

import { ChefHat, ArrowRight, Sparkles, Trophy, Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import type { NextActionType } from '@/hooks/use-core-loop';

interface CoreLoopHeroCardProps {
  nextActionType: NextActionType;
  basicCookingProgress: { completed: number; total: number; percentage: number };
  totalCompleted: number;
  nextRecipeId: string | null;
  nextRecipeTitle: string | null;
  streak: number;
}

export function CoreLoopHeroCard({
  nextActionType,
  basicCookingProgress,
  totalCompleted,
  nextRecipeId,
  nextRecipeTitle,
  streak,
}: CoreLoopHeroCardProps) {
  if (nextActionType === 'all_complete') return null;

  if (nextActionType === 'start_basic_cooking') {
    return (
      <Card className="relative overflow-hidden border-0 shadow-xl animate-slide-up">
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
              <ChefHat className="size-8 text-white" />
            </div>

            {/* Copy */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                Start your cooking journey
              </h3>
              <p className="text-white/85 mt-1.5 text-sm sm:text-base">
                Complete 3 Basic Cooking recipes to unlock more skills.
              </p>
            </div>

            {/* CTA */}
            <Link href={`/recipe/${nextRecipeId || 'boiled-egg'}`} className="flex-shrink-0 w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg gap-2 text-base"
              >
                Start Basic Cooking
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nextActionType === 'continue_basic_cooking') {
    return (
      <Card className="relative overflow-hidden border-0 shadow-xl animate-slide-up">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
                <Flame className="size-8 text-white" />
              </div>

              {/* Copy */}
              <div className="flex-1 min-w-0">
                <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                  Welcome back, chef!
                </h3>
                <p className="text-white/85 mt-1.5 text-sm sm:text-base">
                  You&apos;ve completed {basicCookingProgress.completed} of {basicCookingProgress.total} Basic Cooking recipes.
                  {streak > 0 && ` ${streak}-day streak going!`}
                </p>
              </div>

              {/* CTA */}
              <Link href={nextRecipeId ? `/recipe/${nextRecipeId}` : '/skill/basic-cooking'} className="flex-shrink-0 w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg gap-2 text-base"
                >
                  {nextRecipeTitle ? `Cook: ${nextRecipeTitle}` : 'Continue Cooking'}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Basic Cooking Progress</span>
                <span className="font-semibold text-white">
                  {basicCookingProgress.completed}/{basicCookingProgress.total}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700 ease-out"
                  style={{ width: `${basicCookingProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // explore_unlocked_skills
  return (
    <Card className="relative overflow-hidden border-0 shadow-xl animate-slide-up">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.12),transparent_50%)]" />

      <CardContent className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg flex-shrink-0">
            <Trophy className="size-8 text-white" />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-5 text-yellow-200" />
              <span className="text-yellow-200 text-sm font-semibold uppercase tracking-wide">
                New skills unlocked
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">
              You&apos;ve mastered Basic Cooking!
            </h3>
            <p className="text-white/85 mt-1.5 text-sm sm:text-base">
              Explore Heat Control, Flavor Building, Air Fryer Mastery, and Indian Cuisine.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 w-full sm:w-auto">
            <Link href="/skill/heat-control">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white text-emerald-600 hover:bg-emerald-50 font-bold shadow-lg gap-2 text-base"
              >
                Explore Heat Control
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button
                size="lg"
                variant="ghost"
                className="w-full sm:w-auto text-white hover:bg-white/15 font-medium"
              >
                Browse all skills
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
