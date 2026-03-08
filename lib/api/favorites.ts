import { apiClient } from './client'
import type { Recipe } from '@/lib/types'

interface FavoriteToggleResponse {
  favorited: boolean
  recipe_id: string
}

interface FavoritesListResponse {
  recipes: any[]
  total: number
}

export async function addFavorite(recipeId: string): Promise<FavoriteToggleResponse> {
  return apiClient<FavoriteToggleResponse>(`/recipes/${encodeURIComponent(recipeId)}/favorite`, {
    method: 'POST',
  })
}

export async function removeFavorite(recipeId: string): Promise<FavoriteToggleResponse> {
  return apiClient<FavoriteToggleResponse>(`/recipes/${encodeURIComponent(recipeId)}/favorite`, {
    method: 'DELETE',
  })
}

export async function getFavoriteRecipes(): Promise<FavoritesListResponse> {
  return apiClient<FavoritesListResponse>('/users/me/favorites')
}
