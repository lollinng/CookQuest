'use client'

import { ChefHat, Flame, Clock, Target } from 'lucide-react'
import { SkillCard } from '@/components/skill-card'
import { CookingTip } from '@/components/cooking-tip'
import { RecipeCard } from '@/components/recipe-card'
import { CoreLoopHeroCard } from '@/components/core-loop-hero-card'
import { useRecipeStore, useStoreHydrated } from '@/lib/stores/recipe-store'
import { useRecipes, useSkills } from '@/hooks/use-recipes'
import { useCoreLoopState } from '@/hooks/use-core-loop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { UserMenu } from '@/components/auth/user-menu'
import Link from 'next/link'

export default function Dashboard() {
  const hydrated = useStoreHydrated()

  const {
    getSkillProgress,
    toggleRecipeCompletion,
    isRecipeCompleted,
  } = useRecipeStore()

  const { data: recipes, isLoading, isError } = useRecipes()
  const { data: skills, isLoading: skillsLoading } = useSkills()

  const coreLoop = useCoreLoopState()

  // Get recent recipes for quick access
  const recentRecipes = recipes?.slice(0, 3) || []

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-500 text-lg font-medium">Failed to load recipes</div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <Card className="bg-white shadow-lg animate-slide-up">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="size-8 text-orange-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">CookQuest</h1>
                <p className="text-gray-600">Level {coreLoop.currentLevel} — {coreLoop.currentLevel <= 3 ? 'Beginner' : coreLoop.currentLevel <= 7 ? 'Intermediate' : 'Advanced'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Compact flame badge on mobile */}
              <div className="flex sm:hidden items-center gap-1 bg-orange-100 text-orange-600 rounded-full px-2.5 py-1 font-bold text-sm">
                <Flame className="size-4" />
                <span>{coreLoop.streak}</span>
              </div>
              {/* Full streak info on desktop */}
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <Flame className="size-5" />
                  <span className="font-medium">
                    {coreLoop.streak > 0
                      ? `Streak: ${coreLoop.streak} day${coreLoop.streak !== 1 ? 's' : ''}`
                      : 'Start your streak!'}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {coreLoop.overallProgress.completed} of {coreLoop.overallProgress.total} recipes completed
                </div>
              </div>
              <UserMenu />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress to next level</span>
              <span className="font-medium">{coreLoop.currentXp}/{coreLoop.xpToNextLevel} XP</span>
            </div>
            <Progress
              value={(coreLoop.currentXp / coreLoop.xpToNextLevel) * 100}
              className="h-2 transition-all duration-700"
            />
          </div>
        </CardContent>
      </Card>

      {/* Core Loop Hero CTA */}
      {hydrated && (
        <CoreLoopHeroCard
          nextActionType={coreLoop.nextActionType}
          basicCookingProgress={coreLoop.basicCookingProgress}
          totalCompleted={coreLoop.totalRecipesCompleted}
          nextRecipeId={coreLoop.nextIncompleteRecipeId}
          nextRecipeTitle={coreLoop.nextIncompleteRecipeTitle}
          streak={coreLoop.streak}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cooking Skills - Larger Section */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Target className="size-6 text-purple-500" />
            Cooking Skills
          </h2>
          <div className="space-y-4">
            {skillsLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </Card>
              ))
            ) : (
              skills?.map((skill, index) => {
                const progress = hydrated ? getSkillProgress(skill.id) : { completed: 0, total: skill.recipes.length, percentage: 0 }
                const isLocked = skill.id !== 'basic-cooking' && !coreLoop.isBasicCookingComplete
                return (
                  <div key={skill.id} className="animate-slide-up" style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}>
                    <SkillCard
                      skill={skill}
                      progress={progress}
                      isLocked={isLocked}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Recent Recipes - Smaller Section */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="size-5 text-green-500" />
              Recent Recipes
            </h2>
            <Link href="/recipes">
              <Button variant="outline" size="sm">
                View all
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div data-testid="loading-skeleton" className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentRecipes.map((recipe, index) => {
                const recipeLocked = recipe.skill !== 'basic-cooking' && !coreLoop.isBasicCookingComplete
                return (
                  <div key={recipe.id} className="animate-fade-in" style={{ animationDelay: `${index * 100 + 200}ms`, animationFillMode: 'backwards' }}>
                    <RecipeCard
                      recipe={recipe}
                      isCompleted={hydrated && isRecipeCompleted(recipe.id)}
                      onToggleCompletion={toggleRecipeCompletion}
                      compact={true}
                      isLocked={recipeLocked}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Today's Cooking Tip */}
      <div className="animate-bounce-subtle" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
        <CookingTip />
      </div>

      {/* Continue Learning CTA */}
      {hydrated && skills && coreLoop.overallProgress.percentage < 100 && coreLoop.nextActionType !== 'start_basic_cooking' && (
        <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">👨‍🍳</div>
            <h3 className="text-xl font-bold mb-2">
              Every recipe brings you closer to mastery
            </h3>
            <p className="mb-4 opacity-90">
              What&apos;s cooking today? Pick a skill and keep leveling up.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {skills.map((skill) => {
                const progress = getSkillProgress(skill.id)
                if (progress.percentage === 100) return null
                const isLocked = skill.id !== 'basic-cooking' && !coreLoop.isBasicCookingComplete
                if (isLocked) return null

                return (
                  <Link key={skill.id} href={`/skill/${skill.id}`}>
                    <Button variant="secondary" size="sm" className="gap-2">
                      {skill.name}
                      <span className="text-xs opacity-70">{progress.percentage}%</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Skills Achievement */}
      {hydrated && skills?.some(skill => getSkillProgress(skill.id).percentage === 100) && (
        <Card className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <CardContent className="p-6">
            <div data-testid="skill-completed-badge" className="text-center">
              <h3 className="text-xl font-bold mb-2">Skill Mastered!</h3>
              <p className="opacity-90">
                Congratulations! You&apos;ve completed{' '}
                {skills.filter(skill => getSkillProgress(skill.id).percentage === 100).map(skill => skill.name).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
