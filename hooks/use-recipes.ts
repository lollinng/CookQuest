import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query'
import type { Recipe, SkillType, StructuredIngredient } from '@/lib/types'
import { getRecipes, getRecipeById, getRecipesBySkill, type RecipeFilters } from '@/lib/api/recipes'
import { completeRecipe as apiCompleteRecipe, uncompleteRecipe as apiUncompleteRecipe, type CompletionResult } from '@/lib/api/progress'
import { getSkills, getSkillById } from '@/lib/api/skills'
import { getRandomTip, getDailyTip } from '@/lib/api/tips'
import { addFavorite, removeFavorite, getFavoriteRecipes } from '@/lib/api/favorites'
import { apiClient, getToken, API_BASE_URL } from '@/lib/api/client'

// Map backend snake_case recipe to frontend camelCase
function mapRecipe(raw: any): Recipe {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    skill: raw.skill,
    difficulty: raw.difficulty,
    time: raw.time,
    imageUrl: raw.image_url || raw.imageUrl || '',
    emoji: raw.emoji,
    xpReward: raw.xp_reward || raw.xpReward || 100,
    ingredients: raw.ingredients || [],
    structuredIngredients: (raw.structured_ingredients || raw.structuredIngredients || []).map((si: any): StructuredIngredient => ({
      id: si.id,
      name: si.name,
      category: si.category,
      amount: si.amount != null ? Number(si.amount) : null,
      unit: si.unit,
      preparation: si.preparation,
      optional: si.optional,
      sortOrder: si.sort_order ?? si.sortOrder ?? 0,
      notes: si.notes,
    })),
    instructions: raw.instructions || [],
    tips: raw.tips || [],
    nutritionFacts: raw.nutritionFacts || raw.nutrition_facts,
    isFavorited: raw.is_favorited ?? raw.isFavorited,
  }
}

// Query keys
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...recipeKeys.lists(), { filters }] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  skills: () => [...recipeKeys.all, 'skills'] as const,
  skill: (skillId: string) => [...recipeKeys.skills(), skillId] as const,
}

export const skillKeys = {
  all: ['skills'] as const,
  detail: (id: string) => [...skillKeys.all, id] as const,
}

export const tipKeys = {
  random: ['tips', 'random'] as const,
  daily: ['tips', 'daily'] as const,
}

export const photoKeys = {
  userPhotos: ['userPhotos'] as const,
}

export const favoriteKeys = {
  all: ['favorites'] as const,
}

// Hooks
export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.all,
    queryFn: async () => {
      const data = await getRecipes({ limit: 50 })
      return data.recipes.map(mapRecipe)
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useFilteredRecipes(filters: RecipeFilters) {
  return useQuery({
    queryKey: recipeKeys.list(filters),
    queryFn: async () => {
      const data = await getRecipes(filters)
      return { recipes: data.recipes.map(mapRecipe), pagination: data.pagination }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  })
}

export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: recipeKeys.detail(recipeId),
    queryFn: async () => {
      const recipe = await getRecipeById(recipeId)
      return mapRecipe(recipe)
    },
    enabled: !!recipeId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useSkillData(skillId: string) {
  return useQuery({
    queryKey: recipeKeys.skill(skillId),
    queryFn: async () => {
      const data = await getRecipesBySkill(skillId as SkillType)
      return data.recipes.map(mapRecipe)
    },
    enabled: !!skillId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export function useSkills() {
  return useQuery({
    queryKey: skillKeys.all,
    queryFn: async () => {
      const skills = await getSkills()
      return skills.map(skill => ({
        id: skill.id as SkillType,
        name: skill.name,
        description: skill.description,
        icon: skill.icon,
        recipes: skill.recipes || [],
        color: skill.color,
      }))
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function useRandomTip() {
  return useQuery({
    queryKey: tipKeys.random,
    queryFn: async () => {
      const tip = await getRandomTip() as any
      return { content: tip.content || tip.description || '' }
    },
    staleTime: 0, // Always fetch fresh on refetch
    gcTime: 5 * 60 * 1000,
  })
}

export function useDailyTip() {
  return useQuery({
    queryKey: tipKeys.daily,
    queryFn: () => getDailyTip(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  })
}

// Prefetch functions for better UX
export function usePrefetchRecipe() {
  const queryClient = useQueryClient()

  return (recipeId: string) => {
    queryClient.prefetchQuery({
      queryKey: recipeKeys.detail(recipeId),
      queryFn: async () => {
        const recipe = await getRecipeById(recipeId)
        return mapRecipe(recipe)
      },
      staleTime: 10 * 60 * 1000,
    })
  }
}

export function usePrefetchSkill() {
  const queryClient = useQueryClient()

  return (skillId: string) => {
    queryClient.prefetchQuery({
      queryKey: recipeKeys.skill(skillId),
      queryFn: async () => {
        const data = await getRecipesBySkill(skillId as SkillType)
        return data.recipes.map(mapRecipe)
      },
      staleTime: 5 * 60 * 1000,
    })
  }
}

export function useUserPhotos() {
  return useQuery({
    queryKey: photoKeys.userPhotos,
    queryFn: async () => {
      try {
        const data = await apiClient<{ photos: Array<{ recipe_id: string; photo_url: string; uploaded_at: string }> }>('/users/me/photos')
        return new Map(data.photos.map(p => [p.recipe_id, p.photo_url]))
      } catch {
        return new Map<string, string>()
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useUploadRecipePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ recipeId, file }: { recipeId: string; file: File }) => {
      const formData = new FormData()
      formData.append('photo', file)

      const token = getToken()
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}/photos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error?.message || 'Upload failed')
      }

      const json = await response.json()
      return json.data as { photo_url: string; recipe_id: string }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(photoKeys.userPhotos, (old: Map<string, string> | undefined) => {
        const next = new Map(old || [])
        next.set(data.recipe_id, data.photo_url)
        return next
      })
    },
  })
}

// Utility hook for invalidating recipe data
export function useInvalidateRecipes() {
  const queryClient = useQueryClient()

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: recipeKeys.all }),
    invalidateRecipe: (id: string) => queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) }),
    invalidateSkill: (skillId: string) => queryClient.invalidateQueries({ queryKey: recipeKeys.skill(skillId) }),
  }
}

/**
 * Mutation hook for completing/uncompleting recipes.
 *
 * For logged-in users: calls the server POST /recipes/:id/progress
 * For anonymous users: returns null (caller should use Zustand store directly)
 */
export function useCompleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recipeId: string): Promise<CompletionResult> => {
      return apiCompleteRecipe(recipeId)
    },
    onSuccess: (_data, recipeId) => {
      // Invalidate affected queries so they refetch with fresh data
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) })
    },
  })
}

export function useUncompleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (recipeId: string): Promise<CompletionResult> => {
      return apiUncompleteRecipe(recipeId)
    },
    onSuccess: (_data, recipeId) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) })
    },
  })
}

// ── Favorites ──

export function useFavoriteRecipes() {
  return useQuery({
    queryKey: favoriteKeys.all,
    queryFn: async () => {
      const data = await getFavoriteRecipes()
      return data.recipes.map(mapRecipe)
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ recipeId, isFavorited }: { recipeId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        return removeFavorite(recipeId)
      } else {
        return addFavorite(recipeId)
      }
    },
    onMutate: async ({ recipeId, isFavorited }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: recipeKeys.all })
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all })

      // Snapshot previous values
      const previousRecipes = queryClient.getQueryData<Recipe[]>(recipeKeys.all)
      const previousFavorites = queryClient.getQueryData<Recipe[]>(favoriteKeys.all)

      // Optimistically update recipe list
      queryClient.setQueryData<Recipe[]>(recipeKeys.all, (old) =>
        old?.map(r => r.id === recipeId ? { ...r, isFavorited: !isFavorited } : r)
      )

      // Optimistically update recipe detail
      queryClient.setQueryData(recipeKeys.detail(recipeId), (old: Recipe | undefined) =>
        old ? { ...old, isFavorited: !isFavorited } : old
      )

      // Optimistically update favorites list
      if (isFavorited) {
        // Removing from favorites
        queryClient.setQueryData<Recipe[]>(favoriteKeys.all, (old) =>
          old?.filter(r => r.id !== recipeId)
        )
      } else {
        // Adding to favorites — add from recipe list if available
        const recipe = previousRecipes?.find(r => r.id === recipeId)
        if (recipe) {
          queryClient.setQueryData<Recipe[]>(favoriteKeys.all, (old) =>
            old ? [{ ...recipe, isFavorited: true }, ...old] : [{ ...recipe, isFavorited: true }]
          )
        }
      }

      return { previousRecipes, previousFavorites }
    },
    onError: (_err, { recipeId }, context) => {
      // Roll back on error
      if (context?.previousRecipes) {
        queryClient.setQueryData(recipeKeys.all, context.previousRecipes)
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(favoriteKeys.all, context.previousFavorites)
      }
    },
    onSettled: () => {
      // Refetch to ensure server state is in sync
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all })
      queryClient.invalidateQueries({ queryKey: recipeKeys.all })
    },
  })
}
