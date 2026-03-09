import type { QueryClient } from '@tanstack/react-query'

const SOCIAL_KEY = ['social'] as const

export function invalidateFeedQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: [...SOCIAL_KEY, 'feed'] })
  queryClient.invalidateQueries({ queryKey: [...SOCIAL_KEY, 'feed', 'world'] })
  queryClient.invalidateQueries({ queryKey: [...SOCIAL_KEY, 'posts'] })
}

export function invalidateUserSocialQueries(queryClient: QueryClient, userId: number) {
  queryClient.invalidateQueries({ queryKey: [...SOCIAL_KEY, 'profile', userId] })
  queryClient.invalidateQueries({ queryKey: [...SOCIAL_KEY, 'followers', userId] })
  queryClient.invalidateQueries({ queryKey: [...SOCIAL_KEY, 'following', userId] })
}
