'use client'

import { Heart, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RecipeCard } from '@/components/recipe-card'
import { useFavoriteRecipes } from '@/hooks/use-recipes'
import { useRecipeStore, useStoreHydrated } from '@/lib/stores/recipe-store'
import { useAuth } from '@/lib/auth-context'
import { DemoModeBanner } from '@/components/onboarding/demo-mode-banner'
import { useDemoFavorites } from '@/hooks/use-onboarding'
import Link from 'next/link'

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const hydrated = useStoreHydrated()
  const { isRecipeCompleted, toggleRecipeCompletion } = useRecipeStore()
  const { data: favorites, isLoading, isError } = useFavoriteRecipes()
  const { data: demoRecipes } = useDemoFavorites()

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 bg-cq-border" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden bg-cq-surface border-cq-border">
              <Skeleton className="h-48 w-full bg-cq-border" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-cq-border" />
                <Skeleton className="h-4 w-full bg-cq-border" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-cq-text-primary">
          <Heart className="size-6 text-rose-500" />
          Favorites
        </h1>
        <DemoModeBanner
          title="Save recipes you love"
          subtitle="Sign up to bookmark your favorites and access them anytime."
        />
        {demoRecipes && demoRecipes.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-75">
            {demoRecipes.map((recipe) => (
              <Card key={recipe.id} className="overflow-hidden bg-cq-surface border-cq-border">
                {recipe.imageUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={recipe.imageUrl} alt={recipe.title} className="w-full h-32 object-cover" loading="lazy" />
                )}
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-cq-text-primary">{recipe.title}</p>
                  <p className="text-xs text-cq-text-secondary mt-1">{recipe.difficulty} &middot; {recipe.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-cq-text-secondary hover:text-cq-text-primary">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-cq-text-primary">
            <Heart className="size-7 text-rose-500 fill-rose-500" />
            My Favorites
          </h1>
          <p className="text-cq-text-secondary mt-1">
            {favorites?.length ? `${favorites.length} recipe${favorites.length !== 1 ? 's' : ''} saved` : 'Your saved recipes will appear here'}
          </p>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="overflow-hidden bg-cq-surface border-cq-border">
              <Skeleton className="h-48 w-full bg-cq-border" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-cq-border" />
                <Skeleton className="h-4 w-full bg-cq-border" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="bg-cq-surface border-cq-border">
          <CardContent className="p-8 text-center">
            <p className="text-red-400">Failed to load favorites. Please try again.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : favorites && favorites.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((recipe, index) => (
            <div
              key={recipe.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'backwards' }}
            >
              <RecipeCard
                recipe={{ ...recipe, isFavorited: true }}
                isCompleted={hydrated && isRecipeCompleted(recipe.id)}
                onToggleCompletion={toggleRecipeCompletion}
              />
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-cq-surface border-cq-border">
          <CardContent className="p-12 text-center space-y-4">
            <Heart className="size-12 text-cq-text-muted mx-auto" />
            <h2 className="text-xl font-semibold text-cq-text-primary">No favorites yet</h2>
            <p className="text-cq-text-secondary">
              Tap the heart on any recipe card to save it to your watchlist.
            </p>
            <Link href="/recipes">
              <Button variant="outline" className="border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover">
                Browse Recipes
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
