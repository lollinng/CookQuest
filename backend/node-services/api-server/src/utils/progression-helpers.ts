export function calculateUserLevel(totalXP: number) {
  const level = Math.floor(totalXP / 1000) + 1;
  const currentLevelXP = (level - 1) * 1000;
  const nextLevelXP = level * 1000;
  return {
    level,
    currentLevelXP,
    nextLevelXP,
    progressInLevel: totalXP - currentLevelXP,
    xpToNextLevel: nextLevelXP - totalXP,
  };
}

export function calculateSkillProgress(
  userProgress: { recipe_id: string; completed: boolean }[],
  skillRecipeIds: string[]
) {
  const idSet = new Set(skillRecipeIds);
  const completed = userProgress.filter(p => p.completed && idSet.has(p.recipe_id)).length;
  const total = skillRecipeIds.length;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function enrichRecipesWithProgress<T extends { id: string }>(
  recipes: T[],
  userProgress: { recipe_id: string }[],
  favoriteIds?: Set<string>
) {
  const progressMap = new Map(userProgress.map(p => [p.recipe_id, p]));
  return recipes.map(recipe => ({
    ...recipe,
    user_progress: progressMap.get(recipe.id) || null,
    ...(favoriteIds && { is_favorited: favoriteIds.has(recipe.id) }),
  }));
}
