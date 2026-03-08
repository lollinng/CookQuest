'use client';

import { toast } from 'sonner';
import { Flame, TrendingUp, Trophy, Star } from 'lucide-react';

interface CompletionToastData {
  recipeName: string;
  xpGained: number;
  skillName: string;
  skillCompleted: number;
  skillTotal: number;
  streakDays: number;
  streakUpdated: boolean;
  skillMastered: boolean;
  levelUp: { newLevel: number } | null;
}

/**
 * Show a rich completion toast with XP, streak, and skill progress.
 */
export function showCompletionToast(data: CompletionToastData) {
  toast.custom(
    (id) => (
      <div className="w-[360px] bg-cq-surface rounded-xl shadow-2xl border border-cq-border overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <Star className="size-5 fill-white" />
            <span className="font-bold text-lg">Nice work, chef!</span>
          </div>
        </div>

        <div className="px-4 py-3 space-y-2.5">
          {/* XP earned */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="size-4 text-orange-400" />
            </div>
            <span className="text-sm font-semibold text-cq-text-primary">
              +{data.xpGained} XP earned
            </span>
          </div>

          {/* Skill progress */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-cq-text-secondary">
                {data.skillName}: {data.skillCompleted}/{data.skillTotal} recipes done
              </span>
              <div className="mt-1 h-1.5 rounded-full bg-cq-track overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(data.skillCompleted / data.skillTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Streak */}
          {data.streakUpdated && data.streakDays > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Flame className="size-4 text-red-400" />
              </div>
              <span className="text-sm font-medium text-cq-text-secondary">
                Streak: Day {data.streakDays}! Keep the fire going!
              </span>
            </div>
          )}

          {/* Skill mastered */}
          {data.skillMastered && (
            <div className="flex items-center gap-3 bg-emerald-500/10 rounded-lg p-2 -mx-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="size-4 text-emerald-400" />
              </div>
              <span className="text-sm font-bold text-emerald-400">
                You&apos;ve mastered {data.skillName}!
              </span>
            </div>
          )}

          {/* Level up */}
          {data.levelUp && (
            <div className="flex items-center gap-3 bg-purple-500/10 rounded-lg p-2 -mx-1">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🎉</span>
              </div>
              <span className="text-sm font-bold text-purple-400">
                Level {data.levelUp.newLevel}! You&apos;re becoming a real chef!
              </span>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => toast.dismiss(id)}
          className="w-full text-center text-xs text-cq-text-muted py-2 hover:text-cq-text-secondary transition-colors border-t border-cq-border"
        >
          Tap to dismiss
        </button>
      </div>
    ),
    { duration: 6000 }
  );
}

/**
 * Show a simple toast for uncompleting a recipe.
 */
export function showUncompleteToast(recipeName: string) {
  toast.info(`${recipeName} marked as incomplete`, { duration: 2000 });
}
