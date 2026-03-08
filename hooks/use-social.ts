import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type { UserProfile, UserPost, FollowUser } from '@/lib/types'
import {
  followUser as apiFollowUser,
  unfollowUser as apiUnfollowUser,
  getUserProfile,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getFeed,
  getUserPosts,
} from '@/lib/api/social'

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  feed: () => [...socialKeys.all, 'feed'] as const,
  profile: (userId: number) => [...socialKeys.all, 'profile', userId] as const,
  followers: (userId: number) => [...socialKeys.all, 'followers', userId] as const,
  following: (userId: number) => [...socialKeys.all, 'following', userId] as const,
  search: (q: string) => [...socialKeys.all, 'search', q] as const,
  userPosts: (userId: number) => [...socialKeys.all, 'posts', userId] as const,
}

// ── Queries ──

export function useFeed() {
  return useQuery({
    queryKey: socialKeys.feed(),
    queryFn: getFeed,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useUserProfile(userId: number) {
  return useQuery({
    queryKey: socialKeys.profile(userId),
    queryFn: () => getUserProfile(userId),
    enabled: userId > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useUserFollowers(userId: number) {
  return useQuery({
    queryKey: socialKeys.followers(userId),
    queryFn: () => getUserFollowers(userId),
    enabled: userId > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useUserFollowing(userId: number) {
  return useQuery({
    queryKey: socialKeys.following(userId),
    queryFn: () => getUserFollowing(userId),
    enabled: userId > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: socialKeys.search(query),
    queryFn: () => searchUsers(query),
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  })
}

export function useUserPosts(userId: number) {
  return useQuery({
    queryKey: socialKeys.userPosts(userId),
    queryFn: () => getUserPosts(userId),
    enabled: userId > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

// ── Mutations ──

export function useFollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) => apiFollowUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.profile(userId) })

      const previousProfile = queryClient.getQueryData<UserProfile>(socialKeys.profile(userId))

      // Optimistic update on profile
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(socialKeys.profile(userId), {
          ...previousProfile,
          isFollowing: true,
          followersCount: previousProfile.followersCount + 1,
        })
      }

      return { previousProfile }
    },
    onError: (_err, userId, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(socialKeys.profile(userId), context.previousProfile)
      }
    },
    onSettled: (_data, _err, userId) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.following(userId) })
    },
  })
}

export function useUnfollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: number) => apiUnfollowUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.profile(userId) })

      const previousProfile = queryClient.getQueryData<UserProfile>(socialKeys.profile(userId))

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(socialKeys.profile(userId), {
          ...previousProfile,
          isFollowing: false,
          followersCount: Math.max(0, previousProfile.followersCount - 1),
        })
      }

      return { previousProfile }
    },
    onError: (_err, userId, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(socialKeys.profile(userId), context.previousProfile)
      }
    },
    onSettled: (_data, _err, userId) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.following(userId) })
    },
  })
}
