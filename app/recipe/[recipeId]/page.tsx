'use client'

import { useParams } from 'next/navigation'
import { ArrowLeft, Clock, TrendingUp, CheckCircle2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useRecipeDetail, useCompleteRecipe, useUncompleteRecipe } from '@/hooks/use-recipes'
import { useRecipeStore } from '@/lib/stores/recipe-store'
import { useCoreLoopState } from '@/hooks/use-core-loop'
import { useAuth } from '@/lib/auth-context'
import { getDifficultyColor, formatAmount } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { showCompletionToast, showUncompleteToast } from '@/components/completion-toast'
import Link from 'next/link'
import { RecipeImage } from '@/components/recipe-image'
import { FavoriteButton } from '@/components/favorite-button'
import { SectionErrorBoundary } from '@/components/section-error-boundary'

const SKILL_NAMES: Record<string, string> = {
  'basic-cooking': 'Basic Cooking',
  'heat-control': 'Heat Control',
  'flavor-building': 'Flavor Building',
  'air-fryer': 'Air Fryer Mastery',
  'indian-cuisine': 'Indian Cuisine',
};

export default function RecipeDetail() {
  const params = useParams()
  const recipeId = params.recipeId as string

  const { data: recipe, isLoading, isError } = useRecipeDetail(recipeId)
  const store = useRecipeStore()
  const { isRecipeCompleted, completeRecipe: localComplete, uncompleteRecipe: localUncomplete, getSkillProgress, getStreak, completedToday } = store
  const coreLoop = useCoreLoopState()
  const { user } = useAuth()
  const serverComplete = useCompleteRecipe()
  const serverUncomplete = useUncompleteRecipe()

  const isCompleted = recipe ? isRecipeCompleted(recipe.id) : false

  const handleToggleCompletion = () => {
    if (!recipe) return;

    if (isCompleted) {
      // Uncomplete: always update local store first
      localUncomplete(recipe.id)
      showUncompleteToast(recipe.title)
      // If logged in, sync with server
      if (user) {
        serverUncomplete.mutate(recipe.id)
      }
    } else {
      // Complete: update local store for instant feedback
      const wasCompletedToday = completedToday()
      localComplete(recipe.id)

      if (user) {
        // Logged in: call server and use server response for toast
        serverComplete.mutate(recipe.id, {
          onSuccess: (data) => {
            showCompletionToast({
              recipeName: recipe.title,
              xpGained: data.xp_earned,
              skillName: SKILL_NAMES[data.skill_progress.skill_id] || data.skill_progress.skill_id,
              skillCompleted: data.skill_progress.completed,
              skillTotal: data.skill_progress.total,
              streakDays: data.user.streak_days,
              streakUpdated: data.streak_updated,
              skillMastered: data.skill_progress.percentage === 100,
              levelUp: data.level_up ? { newLevel: data.level_up.new_level } : null,
            })
          },
          onError: () => {
            // Server failed — still show local toast
            const skillProgress = getSkillProgress(recipe.skill)
            showCompletionToast({
              recipeName: recipe.title,
              xpGained: recipe.xpReward || 100,
              skillName: SKILL_NAMES[recipe.skill] || recipe.skill,
              skillCompleted: skillProgress.completed,
              skillTotal: skillProgress.total,
              streakDays: getStreak(),
              streakUpdated: !wasCompletedToday,
              skillMastered: skillProgress.percentage === 100,
              levelUp: null,
            })
          },
        })
      } else {
        // Anonymous: use local state for toast
        const skillProgress = getSkillProgress(recipe.skill)
        const streak = getStreak()

        showCompletionToast({
          recipeName: recipe.title,
          xpGained: recipe.xpReward || 100,
          skillName: SKILL_NAMES[recipe.skill] || recipe.skill,
          skillCompleted: skillProgress.completed,
          skillTotal: skillProgress.total,
          streakDays: streak,
          streakUpdated: !wasCompletedToday,
          skillMastered: skillProgress.percentage === 100,
          levelUp: null,
        })
      }
    }
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-red-500 text-lg font-medium">Recipe not found</div>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-8 w-32" />
        <Card>
          <Skeleton className="h-64 w-full" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </Card>
      </div>
    )
  }

  if (!recipe) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Recipe Header */}
      <Card className="overflow-hidden">
        <div className="relative h-64 md:h-80">
          <RecipeImage
            src={recipe.imageUrl}
            alt={recipe.title}
            skill={recipe.skill}
            emoji={recipe.emoji}
            emojiSize="lg"
            variant="hero"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              {recipe.emoji && (
                <span className="text-3xl bg-white/20 rounded-lg p-2">{recipe.emoji}</span>
              )}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{recipe.title}</h1>
                <p className="text-lg opacity-90 mt-1">{recipe.description}</p>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-sm">{recipe.time}</span>
            </div>
            <Badge className={getDifficultyColor(recipe.difficulty)}>
              {recipe.difficulty}
            </Badge>
            {recipe.xpReward && (
              <span className="inline-flex items-center gap-1 bg-orange-500/20 text-orange-400 text-sm font-semibold px-2.5 py-0.5 rounded-full">
                <TrendingUp className="size-3.5" />
                +{recipe.xpReward} XP
              </span>
            )}
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <span className="text-sm capitalize">{recipe.skill.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm">Serves 2-4</span>
            </div>
            <FavoriteButton
              recipeId={recipe.id}
              isFavorited={recipe.isFavorited ?? false}
              size="md"
            />
          </div>

          {/* Completion Toggle */}
          <Button
            onClick={handleToggleCompletion}
            className={`
              w-full mb-6 text-base font-bold ${
                isCompleted
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }
            `}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Done! Undo?
              </>
            ) : (
              'I made this!'
            )}
          </Button>

          {isCompleted && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="size-5" />
                <span className="font-medium">Great job, chef!</span>
              </div>
              <p className="text-green-300 text-sm mt-1">
                This one&apos;s in the bag. Keep going — every recipe levels you up!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipe Content */}
      <SectionErrorBoundary section="recipe-content">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Ingredients */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(recipe.structuredIngredients && recipe.structuredIngredients.length > 0) ? (
                  recipe.structuredIngredients.map((ing) => (
                    <li key={ing.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-foreground">
                        {ing.amount != null && <span className="font-semibold">{formatAmount(ing.amount)}</span>}
                        {ing.unit && <span className="font-semibold"> {ing.unit}</span>}
                        {(ing.amount != null || ing.unit) && ' '}{ing.name}
                        {ing.preparation && <span className="text-foreground/70"> ({ing.preparation})</span>}
                        {ing.optional && <span className="text-foreground/60 text-sm"> (optional)</span>}
                        {ing.notes && <span className="text-foreground/70 text-sm"> — {ing.notes}</span>}
                      </span>
                    </li>
                  ))
                ) : (
                  recipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                      <span className="text-foreground">{ingredient}</span>
                    </li>
                  ))
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-6">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex gap-4">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-foreground leading-relaxed pt-1">{instruction}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </SectionErrorBoundary>

      {/* Tips */}
      {recipe.tips && recipe.tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pro Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recipe.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Nutrition Facts */}
      {recipe.nutritionFacts && (
        <Card>
          <CardHeader>
            <CardTitle>Nutrition Facts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{recipe.nutritionFacts.calories}</div>
                <div className="text-sm text-muted-foreground">Calories</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-foreground">{recipe.nutritionFacts.protein}</div>
                <div className="text-sm text-muted-foreground">Protein</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-foreground">{recipe.nutritionFacts.carbs}</div>
                <div className="text-sm text-muted-foreground">Carbs</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-medium text-foreground">{recipe.nutritionFacts.fat}</div>
                <div className="text-sm text-muted-foreground">Fat</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}