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
          ? 'border-gray-300 bg-gray-100 cursor-not-allowed opacity-75' 
          : isCompleted 
            ? 'border-green-400 bg-green-50 cursor-pointer hover:shadow-xl' 
            : 'border-gray-100 hover:border-orange-200 cursor-pointer hover:shadow-xl'
        }
      `}
    >
        <div className="relative">
          {/* Recipe Image */}
          <div className={`relative ${compact ? 'h-32' : 'h-48'} bg-gray-100`}>
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
              <div className="bg-white rounded-full p-3 shadow-lg">
                <Lock className="size-6 text-gray-600" />
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
                    ? 'bg-green-500 hover:bg-green-600 text-white animate-bounce-subtle'
                    : 'bg-white hover:bg-gray-50 text-gray-700 hover:ring-2 hover:ring-orange-300 hover:ring-offset-1'
                  }
                `}
              >
                {isCompleted && <CheckCircle2 data-testid="check-icon" className="size-5" />}
                {!isCompleted && <div className="size-5 rounded-full border-2 border-gray-300" />}
              </Button>
            </div>
          )}

          {/* Recipe Emoji */}
          {recipe.emoji && (
            <div className="absolute top-3 left-3">
              <div className="bg-white rounded-full p-2 shadow-lg">
                <span className="text-xl">{recipe.emoji}</span>
              </div>
            </div>
          )}
        </div>

        <CardContent className={`${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
          {/* Title and Description */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
              {recipe.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-2 mt-1">
              {recipe.description}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-gray-500">
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
                <span className="inline-flex items-center gap-0.5 bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  <TrendingUp className="size-3" />
                  +{recipe.xpReward} XP
                </span>
              )}
              {/* Skill indicator */}
              {!recipe.xpReward && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="size-3 text-gray-400" />
                  <span className="text-xs text-gray-500 capitalize">
                    {recipe.skill.replace('-', ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator for completed recipes */}
          {isCompleted && !isLocked && (
            <div className="bg-green-100 rounded-lg p-2 mt-2">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">Completed!</span>
              </div>
            </div>
          )}

          {/* Locked indicator */}
          {isLocked && (
            <div className="bg-gray-100 rounded-lg p-2 mt-2">
              <div className="flex items-center gap-2 text-gray-600">
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