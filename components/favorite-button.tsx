'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  if (!isAuthenticated) return null

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
        className={`${size === 'sm' ? 'size-4' : 'size-5'} transition-transform duration-200 ${
          isFavorited ? 'fill-current scale-110' : ''
        } ${toggleFavorite.isPending ? 'animate-pulse' : ''}`}
      />
    </Button>
  )
}
