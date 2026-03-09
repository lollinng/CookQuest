'use client';

import { useState } from 'react';
import { Flame, ChevronDown, ChevronRight, Check, Trophy, Clock, Target, Lightbulb, ChefHat } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { INDIAN_COOKING_PLAN, TOTAL_PLAN_DAYS } from '@/lib/indian-plan-data';
import type { PlanDay, PlanWeek } from '@/lib/indian-plan-data';
import { useRecipeStore, useStoreHydrated } from '@/lib/stores/recipe-store';
import { useSkillData } from '@/hooks/use-recipes';
import type { Recipe } from '@/lib/types';

export default function IndianCookingPage() {
  const hydrated = useStoreHydrated();
  const { isRecipeCompleted, toggleRecipeCompletion } = useRecipeStore();
  const { data: recipes, isLoading } = useSkillData('indian-cuisine');

  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true, 2: false });
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const recipeMap = new Map<string, Recipe>();
  recipes?.forEach(r => recipeMap.set(r.id, r));

  const completedCount = hydrated
    ? INDIAN_COOKING_PLAN.flatMap(w => w.days).filter(d => isRecipeCompleted(d.recipeId)).length
    : 0;
  const progressPercent = (completedCount / TOTAL_PLAN_DAYS) * 100;

  const toggleWeek = (week: number) => {
    setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }));
  };

  const toggleDay = (day: number) => {
    setExpandedDay(prev => prev === day ? null : day);
  };

  const getWeekProgress = (week: PlanWeek) => {
    if (!hydrated) return { completed: 0, total: week.days.length };
    const completed = week.days.filter(d => isRecipeCompleted(d.recipeId)).length;
    return { completed, total: week.days.length };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <Card className="bg-gradient-to-r from-amber-600 to-orange-500 border-0 text-white shadow-lg">
        <CardContent className="p-6 text-center">
          <Flame className="size-10 mx-auto mb-2" />
          <h1 className="text-2xl font-black tracking-tight">2-Week Indian Cooking Plan</h1>
          <p className="text-white/80 text-sm mt-1">From zero to cooking full Indian meals</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/80">Progress</span>
              <span className="font-bold">{completedCount}/{TOTAL_PLAN_DAYS} days</span>
            </div>
            <Progress value={progressPercent} className="h-2 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Week cards */}
      {INDIAN_COOKING_PLAN.map(week => {
        const wp = getWeekProgress(week);
        const isExpanded = expandedWeeks[week.week] ?? false;

        return (
          <Card key={week.week} className="bg-cq-surface border-cq-border overflow-hidden">
            {/* Week header */}
            <button
              onClick={() => toggleWeek(week.week)}
              className="w-full flex items-center justify-between p-4 hover:bg-cq-surface-hover transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronDown className="size-5 text-amber-500" /> : <ChevronRight className="size-5 text-cq-text-muted" />}
                <div>
                  <h2 className="text-lg font-bold text-cq-text-primary">{week.title}</h2>
                  <p className="text-xs text-cq-text-muted mt-0.5">{week.focus}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${wp.completed === wp.total ? 'text-green-500' : 'text-cq-text-secondary'}`}>
                  {wp.completed}/{wp.total}
                </span>
                <div className="w-16 h-1.5 rounded-full bg-cq-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(wp.completed / wp.total) * 100}%` }}
                  />
                </div>
              </div>
            </button>

            {/* Day list */}
            {isExpanded && (
              <div className="border-t border-cq-border">
                {week.days.map(day => {
                  const completed = hydrated && isRecipeCompleted(day.recipeId);
                  const isCurrentDay = !completed && expandedDay !== day.day &&
                    hydrated && INDIAN_COOKING_PLAN.flatMap(w => w.days).find(d => !isRecipeCompleted(d.recipeId))?.day === day.day;
                  const isDayExpanded = expandedDay === day.day;
                  const recipe = recipeMap.get(day.recipeId);

                  return (
                    <div key={day.day}>
                      {/* Day node row */}
                      <button
                        onClick={() => toggleDay(day.day)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cq-surface-hover ${
                          completed ? 'bg-green-500/5' : ''
                        } ${isCurrentDay ? 'border-l-4 border-amber-500' : 'border-l-4 border-transparent'}`}
                      >
                        {/* Day number / status icon */}
                        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          completed
                            ? 'bg-green-500 text-white'
                            : day.isAssemblyDay
                              ? 'bg-amber-100 text-amber-700'
                              : isCurrentDay
                                ? 'bg-amber-500 text-white'
                                : 'bg-cq-border text-cq-text-secondary'
                        }`}>
                          {completed ? <Check className="size-4" />
                            : day.isAssemblyDay ? <Trophy className="size-4" />
                            : day.day}
                        </div>

                        {/* Day info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${completed ? 'text-cq-text-muted' : 'text-cq-text-primary'}`}>
                              Day {day.day} — {day.title}
                            </span>
                            {day.isAssemblyDay && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                                Assembly
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-cq-text-muted truncate">{day.subtitle}</p>
                        </div>

                        {/* Expand indicator */}
                        {isDayExpanded
                          ? <ChevronDown className="size-4 text-cq-text-muted shrink-0" />
                          : <ChevronRight className="size-4 text-cq-text-muted shrink-0" />}
                      </button>

                      {/* Expanded day detail */}
                      {isDayExpanded && (
                        <DayDetail
                          day={day}
                          recipe={recipe}
                          isLoading={isLoading}
                          completed={completed}
                          onToggleComplete={() => toggleRecipeCompletion(day.recipeId)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}

      {/* Completion celebration */}
      {hydrated && completedCount === TOTAL_PLAN_DAYS && (
        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
          <CardContent className="p-6 text-center">
            <Trophy className="size-12 mx-auto mb-2" />
            <h3 className="text-xl font-bold">Plan Complete!</h3>
            <p className="text-white/90 text-sm mt-1">
              You&apos;ve mastered the core techniques of Indian cooking. Time to experiment!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DayDetail({
  day,
  recipe,
  isLoading,
  completed,
  onToggleComplete,
}: {
  day: PlanDay;
  recipe?: Recipe;
  isLoading: boolean;
  completed: boolean;
  onToggleComplete: () => void;
}) {
  if (isLoading) {
    return (
      <div className="px-4 py-4 border-t border-cq-border/50 bg-cq-bg/50 space-y-3">
        <Skeleton className="h-40 w-full rounded-lg bg-cq-border" />
        <Skeleton className="h-4 w-2/3 bg-cq-border" />
        <Skeleton className="h-4 w-1/2 bg-cq-border" />
      </div>
    );
  }

  const ingredients: string[] = recipe?.ingredients ?? [];
  const instructions: string[] = recipe?.instructions ?? [];
  const tips: string[] = recipe?.tips ?? [];

  return (
    <div className="px-4 py-4 border-t border-cq-border/50 bg-cq-bg/50 space-y-4">
      {/* Recipe image */}
      {recipe?.imageUrl && (
        <img
          src={recipe.imageUrl}
          alt={recipe.title || day.title}
          className="w-full aspect-video object-cover rounded-xl"
        />
      )}

      {/* Goals */}
      <div>
        <h4 className="text-xs font-bold uppercase text-amber-600 mb-1.5 flex items-center gap-1.5">
          <Target className="size-3.5" /> Goals
        </h4>
        <ul className="space-y-1">
          {day.goals.map((goal, i) => (
            <li key={i} className="text-sm text-cq-text-secondary flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">&#8226;</span> {goal}
            </li>
          ))}
        </ul>
      </div>

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase text-amber-600 mb-1.5 flex items-center gap-1.5">
            <ChefHat className="size-3.5" /> Ingredients
          </h4>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {ingredients.map((ing, i) => (
              <li key={i} className="text-sm text-cq-text-secondary flex items-start gap-1.5">
                <span className="text-cq-text-muted">&#8226;</span> {ing}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Instructions */}
      {instructions.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase text-amber-600 mb-1.5 flex items-center gap-1.5">
            <Clock className="size-3.5" /> Instructions
          </h4>
          <ol className="space-y-2">
            {instructions.map((step, i) => (
              <li key={i} className="text-sm text-cq-text-secondary flex items-start gap-2">
                <span className="text-amber-500 font-bold text-xs mt-0.5 shrink-0 w-5 text-right">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/5 rounded-lg p-3">
          <h4 className="text-xs font-bold uppercase text-amber-600 mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="size-3.5" /> Tips
          </h4>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="text-sm text-amber-800 dark:text-amber-200/80">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Skills learned */}
      <div className="flex flex-wrap gap-1.5">
        {day.skillsLearned.map((skill, i) => (
          <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-medium">
            {skill}
          </span>
        ))}
      </div>

      {/* Complete button */}
      <Button
        onClick={onToggleComplete}
        variant={completed ? 'outline' : 'default'}
        className={`w-full ${
          completed
            ? 'border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10'
            : 'bg-amber-500 hover:bg-amber-600 text-white'
        }`}
      >
        {completed ? (
          <><Check className="size-4 mr-2" /> Completed</>
        ) : (
          'Mark Complete'
        )}
      </Button>
    </div>
  );
}
