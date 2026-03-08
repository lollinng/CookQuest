'use client';

import { Target, CheckCircle2, Flame, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DailyQuestCardProps {
  completedToday: boolean;
  streak: number;
  nextRecipeId: string | null;
  nextRecipeTitle: string | null;
  totalCompleted: number;
  totalRecipes: number;
}

export function DailyQuestCard({
  completedToday,
  streak,
  nextRecipeId,
  nextRecipeTitle,
  totalCompleted,
  totalRecipes,
}: DailyQuestCardProps) {
  // Don't show if all recipes are done
  if (totalCompleted >= totalRecipes && totalRecipes > 0) return null;

  if (completedToday) {
    return (
      <Card className="border-green-500/30 bg-cq-surface animate-slide-up">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="size-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-cq-text-primary text-sm">Daily Quest Complete!</h4>
              </div>
              <p className="text-cq-text-secondary text-sm mt-0.5">
                You cooked today.{' '}
                {streak > 1 && (
                  <span className="font-semibold">
                    Day {streak} streak!
                  </span>
                )}
                {streak <= 1 && 'Great start!'}
              </p>
            </div>
            {nextRecipeId && (
              <Link href={`/recipe/${nextRecipeId}`} className="flex-shrink-0">
                <Button variant="ghost" size="sm" className="text-green-400 hover:bg-green-500/10 gap-1 text-xs font-semibold">
                  Cook more
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-cq-surface animate-slide-up">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Target className="size-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-cq-text-primary text-sm">Daily Quest</h4>
            <p className="text-cq-text-secondary text-sm mt-0.5">
              Complete 1 recipe to {streak > 0
                ? `keep your ${streak}-day streak alive!`
                : 'start a streak!'}
            </p>
          </div>
          {nextRecipeId ? (
            <Link href={`/recipe/${nextRecipeId}`} className="flex-shrink-0">
              <Button size="sm" className="bg-cq-primary hover:bg-cq-primary-hover text-cq-primary-text gap-1 text-xs font-semibold">
                <Flame className="size-3.5" />
                Start
              </Button>
            </Link>
          ) : (
            <Link href="/" className="flex-shrink-0">
              <Button size="sm" className="bg-cq-primary hover:bg-cq-primary-hover text-cq-primary-text gap-1 text-xs font-semibold">
                Browse
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
