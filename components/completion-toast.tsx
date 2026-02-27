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
      <div className="w-[360px] bg-white rounded-xl shadow-2xl border border-orange-100 overflow-hidden animate-slide-up">
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
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="size-4 text-orange-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              +{data.xpGained} XP earned
            </span>
          </div>

          {/* Skill progress */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">📊</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm text-gray-700">
                {data.skillName}: {data.skillCompleted}/{data.skillTotal} recipes done
              </span>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
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
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <Flame className="size-4 text-red-500" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Streak: Day {data.streakDays}! Keep the fire going!
              </span>
            </div>
          )}

          {/* Skill mastered */}
          {data.skillMastered && (
            <div className="flex items-center gap-3 bg-emerald-50 rounded-lg p-2 -mx-1">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Trophy className="size-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-emerald-800">
                You&apos;ve mastered {data.skillName}!
              </span>
            </div>
          )}

          {/* Level up */}
          {data.levelUp && (
            <div className="flex items-center gap-3 bg-purple-50 rounded-lg p-2 -mx-1">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🎉</span>
              </div>
              <span className="text-sm font-bold text-purple-800">
                Level up! You&apos;re now Level {data.levelUp.newLevel}!
              </span>
            </div>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => toast.dismiss(id)}
          className="w-full text-center text-xs text-gray-400 py-2 hover:text-gray-600 transition-colors border-t border-gray-50"
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
