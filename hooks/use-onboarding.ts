import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'

// Query keys
export const onboardingKeys = {
  status: ['onboarding', 'status'] as const,
}

export const demoKeys = {
  feed: ['demo', 'feed'] as const,
  people: ['demo', 'people'] as const,
  favorites: ['demo', 'favorites'] as const,
}

// ── Onboarding hooks (auth required) ──

interface OnboardingStatus {
  hasCompletedOnboarding: boolean
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | null
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: onboardingKeys.status,
    queryFn: () => apiClient<OnboardingStatus>('/onboarding/status'),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useSubmitSkillLevel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (skillLevel: 'beginner' | 'intermediate' | 'advanced') =>
      apiClient<{ skillLevel: string }>('/onboarding/quiz', {
        method: 'POST',
        body: { skillLevel },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.status })
    },
  })
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      apiClient<{ hasCompletedOnboarding: boolean }>('/onboarding/complete', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: onboardingKeys.status })
    },
  })
}

// ── Demo hooks (no auth, public endpoints) ──

interface DemoPost {
  id: string
  type: 'recipe_completed' | 'photo_upload' | 'milestone'
  userId: number
  username: string
  displayName: string
  avatarUrl: string
  recipeTitle: string | null
  caption: string
  photoUrl: string | null
  xpEarned: number
  likes: number
  comments: number
  createdAt: string
}

interface DemoPerson {
  id: number
  username: string
  displayName: string
  avatarUrl: string
  skillLevel: string
  recipesCompleted: number
  totalXp: number
  streakDays: number
}

interface DemoRecipe {
  id: string
  title: string
  description: string
  skill: string
  difficulty: string
  time: string
  imageUrl: string
  emoji: string
  xpReward: number
}

export function useDemoFeed() {
  return useQuery({
    queryKey: demoKeys.feed,
    queryFn: () => apiClient<DemoPost[]>('/demo/feed', { skipAuth: true }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}

export function useDemoPeople() {
  return useQuery({
    queryKey: demoKeys.people,
    queryFn: () => apiClient<DemoPerson[]>('/demo/people', { skipAuth: true }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}

export function useDemoFavorites() {
  return useQuery({
    queryKey: demoKeys.favorites,
    queryFn: () => apiClient<DemoRecipe[]>('/demo/favorites', { skipAuth: true }),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}
