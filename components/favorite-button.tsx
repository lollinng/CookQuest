'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useToggleFavorite } from '@/hooks/use-recipes'
import { useAuth } from '@/lib/auth-context'

interface FavoriteButtonProps {
  recipeId: string
  isFavorited: boolean
  size?: 'sm' | 'md'
}

export function FavoriteButton({ recipeId, isFavorited, size = 'sm' }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth()
  const toggleFavorite = useToggleFavorite()

  const iconSize = size === 'sm' ? 'size-4' : 'size-5'

  if (!isAuthenticated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => { e.stopPropagation(); e.preventDefault() }}
            className="rounded-full p-2 shadow-lg bg-cq-surface/60 text-cq-text-muted cursor-not-allowed opacity-60"
          >
            <Heart className={iconSize} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-cq-surface text-cq-text-primary border border-cq-border">
          Sign in to favorite recipes
        </TooltipContent>
      </Tooltip>
    )
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    toggleFavorite.mutate({ recipeId, isFavorited })
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleClick}
      disabled={toggleFavorite.isPending}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      className={`
        rounded-full p-2 shadow-lg transition-all duration-200
        ${isFavorited
          ? 'bg-rose-500 hover:bg-rose-600 text-white'
          : 'bg-cq-surface hover:bg-cq-surface-hover text-cq-text-secondary hover:text-rose-400'
        }
      `}
    >
      <Heart
        className={`${iconSize} transition-transform duration-200 ${
          isFavorited ? 'fill-current scale-110' : ''
        } ${toggleFavorite.isPending ? 'animate-pulse' : ''}`}
      />
    </Button>
  )
}
