'use client'

import { CheckCircle2, Clock, TrendingUp, Lock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getDifficultyColor } from '@/lib/utils'
import type { Recipe } from '@/lib/types'
import Link from 'next/link'
import { RecipeImage } from '@/components/recipe-image'

interface RecipeCardProps {
  recipe: Recipe
  isCompleted: boolean
  onToggleCompletion: (recipeId: string) => void
  compact?: boolean
  isLocked?: boolean
}

export function RecipeCard({ recipe, isCompleted, onToggleCompletion, compact = false, isLocked = false }: RecipeCardProps) {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!isLocked) {
      onToggleCompletion(recipe.id)
    }
  }

  const cardContent = (
    <Card 
      data-testid="recipe-card"
      className={`
        overflow-hidden shadow-md transition-all duration-200 
        border-2 group relative
        ${isLocked
          ? 'border-cq-border bg-cq-bg cursor-not-allowed opacity-60'
          : isCompleted
            ? 'border-cq-success bg-green-500/10 cursor-pointer hover:shadow-xl'
            : 'border-cq-border hover:border-cq-border-accent cursor-pointer hover:shadow-xl'
        }
      `}
    >
        <div className="relative">
          {/* Recipe Image */}
          <div className={`relative ${compact ? 'h-32' : 'h-48'} bg-cq-bg`}>
            <RecipeImage
              src={recipe.imageUrl}
              alt={recipe.title}
              skill={recipe.skill}
              emoji={recipe.emoji}
              emojiSize={compact ? 'sm' : 'md'}
              className="group-hover:scale-105 transition-transform duration-200"
            />
          </div>

          {/* Lock overlay for locked recipes */}
          {isLocked && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <div className="bg-cq-surface rounded-full p-3 shadow-lg">
                <Lock className="size-6 text-cq-text-muted" />
              </div>
            </div>
          )}

          {/* Completion Status */}
          {!isLocked && (
            <div className="absolute top-3 right-3">
              <Button
                size="sm"
                variant={isCompleted ? "default" : "secondary"}
                onClick={handleToggle}
                data-testid="toggle-completion"
                title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                className={`
                  rounded-full p-2 shadow-lg transition-all duration-200
                  ${isCompleted
                    ? 'bg-green-500 hover:bg-green-600 text-white animate-completion-glow'
                    : 'bg-cq-surface hover:bg-cq-surface-hover text-cq-text-secondary hover:ring-2 hover:ring-cq-primary hover:ring-offset-1'
                  }
                `}
              >
                {isCompleted && <CheckCircle2 data-testid="check-icon" className="size-5 animate-check-draw" />}
                {!isCompleted && <div className="size-5 rounded-full border-2 border-cq-border" />}
              </Button>
            </div>
          )}

          {/* Recipe Emoji */}
          {recipe.emoji && (
            <div className="absolute top-3 left-3">
              <div className="bg-cq-surface rounded-full p-2 shadow-lg">
                <span className="text-xl">{recipe.emoji}</span>
              </div>
            </div>
          )}
        </div>

        <CardContent className={`${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
          {/* Title and Description */}
          <div>
            <h3 className="font-semibold text-lg text-cq-text-primary group-hover:text-cq-primary transition-colors line-clamp-1">
              {recipe.title}
            </h3>
            <p className="text-sm text-cq-text-secondary line-clamp-2 mt-1">
              {recipe.description}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-cq-text-muted">
                <Clock className="size-3" />
                <span>{recipe.time}</span>
              </div>
              <Badge
                variant="secondary"
                className={getDifficultyColor(recipe.difficulty)}
              >
                {recipe.difficulty}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {/* XP reward badge */}
              {recipe.xpReward && (
                <span className="inline-flex items-center gap-0.5 bg-orange-500/20 text-orange-400 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <TrendingUp className="size-3" />
                  +{recipe.xpReward} XP
                </span>
              )}
              {/* Skill indicator */}
              {!recipe.xpReward && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="size-3 text-cq-text-muted" />
                  <span className="text-xs text-cq-text-muted capitalize">
                    {recipe.skill.replace('-', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator for completed recipes */}
          {isCompleted && !isLocked && (
            <div className="bg-green-500/20 rounded-lg p-2 mt-2">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">Completed!</span>
              </div>
            </div>
          )}

          {/* Locked indicator */}
          {isLocked && (
            <div className="bg-cq-bg rounded-lg p-2 mt-2">
              <div className="flex items-center gap-2 text-cq-text-muted">
                <Lock className="size-4" />
                <span className="text-sm font-medium">Complete Basic Cooking to unlock</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
  )

  return isLocked ? (
    <div className="block">
      {cardContent}
    </div>
  ) : (
    <Link href={`/recipe/${recipe.id}`} className="block">
      {cardContent}
    </Link>
  )
}