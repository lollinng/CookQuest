'use client';

import { useMemo } from 'react';
import { useRecipeStore, useStoreHydrated } from '@/lib/stores/recipe-store';
import { useRecipes } from '@/hooks/use-recipes';
import { calculateLevel } from '@/lib/utils';
import type { SkillType, Recipe } from '@/lib/types';

// Ordered list of Basic Cooking recipe IDs (first = start recipe)
const BASIC_COOKING_RECIPES = ['boiled-egg', 'make-rice', 'chop-onion'];

const SKILL_ORDER: SkillType[] = [
  'basic-cooking',
  'heat-control',
  'flavor-building',
  'air-fryer',
  'indian-cuisine',
];

export type NextActionType =
  | 'start_basic_cooking'
  | 'continue_basic_cooking'
  | 'explore_unlocked_skills'
  | 'all_complete';

export interface CoreLoopState {
  // Next action
  nextActionType: NextActionType;
  primaryCtaLabel: string;
  primaryCtaRoute: string;
  secondaryActions: Array<{ label: string; route: string }>;

  // Progress data
  basicCookingProgress: { completed: number; total: number; percentage: number };
  overallProgress: { completed: number; total: number; percentage: number };
  currentLevel: number;
  currentXp: number;
  xpToNextLevel: number;
  streak: number;
  totalRecipesCompleted: number;

  // Unlock state
  unlockedSkills: SkillType[];
  isBasicCookingComplete: boolean;

  // Next recipe
  nextIncompleteRecipeId: string | null;
  nextIncompleteRecipeTitle: string | null;
}

/**
 * Central hook for the entire core loop state.
 * Determines what the user should do next, their progress, and unlock status.
 */
export function useCoreLoopState(): CoreLoopState {
  const hydrated = useStoreHydrated();
  const {
    getSkillProgress,
    getOverallProgress,
    isRecipeCompleted,
    getStreak,
    completedRecipes,
  } = useRecipeStore();

  const { data: recipes } = useRecipes();

  return useMemo(() => {
    // Safe defaults before hydration
    if (!hydrated) {
      return defaultState();
    }

    const bcProgress = getSkillProgress('basic-cooking');
    const overall = getOverallProgress();
    const { level, experience, nextLevelAt } = calculateLevel(overall.completed);
    const streak = typeof getStreak === 'function' ? getStreak() : 0;

    const isBasicCookingComplete = bcProgress.percentage === 100;

    // Determine unlocked skills
    const unlockedSkills: SkillType[] = isBasicCookingComplete
      ? [...SKILL_ORDER]
      : ['basic-cooking'];

    // Find next incomplete Basic Cooking recipe
    let nextIncompleteRecipeId: string | null = null;
    let nextIncompleteRecipeTitle: string | null = null;

    for (const recipeId of BASIC_COOKING_RECIPES) {
      if (!isRecipeCompleted(recipeId)) {
        nextIncompleteRecipeId = recipeId;
        // Try to find the title from loaded recipes
        const match = recipes?.find((r: Recipe) => r.id === recipeId);
        nextIncompleteRecipeTitle = match?.title || recipeId;
        break;
      }
    }

    // Determine next action
    let nextActionType: NextActionType;
    let primaryCtaLabel: string;
    let primaryCtaRoute: string;
    const secondaryActions: Array<{ label: string; route: string }> = [];

    if (overall.completed === 0) {
      nextActionType = 'start_basic_cooking';
      primaryCtaLabel = 'Start Basic Cooking';
      primaryCtaRoute = `/recipe/${BASIC_COOKING_RECIPES[0]}`;
    } else if (!isBasicCookingComplete) {
      nextActionType = 'continue_basic_cooking';
      primaryCtaLabel = nextIncompleteRecipeId
        ? `Continue: ${nextIncompleteRecipeTitle}`
        : 'Continue Basic Cooking';
      primaryCtaRoute = nextIncompleteRecipeId
        ? `/recipe/${nextIncompleteRecipeId}`
        : '/skill/basic-cooking';
      secondaryActions.push({ label: 'View all recipes', route: '/skill/basic-cooking' });
    } else if (overall.percentage < 100) {
      nextActionType = 'explore_unlocked_skills';
      primaryCtaLabel = 'Explore Heat Control';
      primaryCtaRoute = '/skill/heat-control';
      secondaryActions.push(
        { label: 'Flavor Building', route: '/skill/flavor-building' },
        { label: 'Air Fryer Mastery', route: '/skill/air-fryer' },
        { label: 'Indian Cuisine', route: '/skill/indian-cuisine' }
      );
    } else {
      nextActionType = 'all_complete';
      primaryCtaLabel = 'View All Skills';
      primaryCtaRoute = '/';
    }

    return {
      nextActionType,
      primaryCtaLabel,
      primaryCtaRoute,
      secondaryActions,
      basicCookingProgress: bcProgress,
      overallProgress: overall,
      currentLevel: level,
      currentXp: experience,
      xpToNextLevel: nextLevelAt,
      streak,
      totalRecipesCompleted: overall.completed,
      unlockedSkills,
      isBasicCookingComplete,
      nextIncompleteRecipeId,
      nextIncompleteRecipeTitle,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, completedRecipes, recipes]);
}

function defaultState(): CoreLoopState {
  return {
    nextActionType: 'start_basic_cooking',
    primaryCtaLabel: 'Start Basic Cooking',
    primaryCtaRoute: '/recipe/boiled-egg',
    secondaryActions: [],
    basicCookingProgress: { completed: 0, total: 3, percentage: 0 },
    overallProgress: { completed: 0, total: 15, percentage: 0 },
    currentLevel: 1,
    currentXp: 0,
    xpToNextLevel: 1000,
    streak: 0,
    totalRecipesCompleted: 0,
    unlockedSkills: ['basic-cooking'],
    isBasicCookingComplete: false,
    nextIncompleteRecipeId: 'boiled-egg',
    nextIncompleteRecipeTitle: 'Perfect Boiled Egg',
  };
}
