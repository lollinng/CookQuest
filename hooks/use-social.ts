import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type { UserProfile, UserPost, FollowUser, PostComment } from '@/lib/types'
import {
  followUser as apiFollowUser,
  unfollowUser as apiUnfollowUser,
  getUserProfile,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getFeed,
  getUserPosts,
  getPostComments,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
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
  comments: (postId: number) => [...socialKeys.all, 'comments', postId] as const,
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

export function usePostComments(postId: number) {
  return useQuery({
    queryKey: socialKeys.comments(postId),
    queryFn: () => getPostComments(postId),
    enabled: postId > 0,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  })
}

// ── Mutations ──

export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      return apiAddComment(postId, content)
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(postId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      // Invalidate all user posts queries (we don't know which user's post it is)
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, commentId }: { postId: number; commentId: number }) => {
      return apiDeleteComment(postId, commentId)
    },
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(postId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

export function useFollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: number) => {
      try {
        return await apiFollowUser(userId);
      } catch (err: any) {
        // 409 = already following — treat as success
        if (err?.status === 409 || err?.message?.includes('Already following')) {
          return { following: true };
        }
        throw err;
      }
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.profile(userId) })
      await queryClient.cancelQueries({ queryKey: socialKeys.all })

      const previousProfile = queryClient.getQueryData<UserProfile>(socialKeys.profile(userId))

      // Optimistic update on profile
      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(socialKeys.profile(userId), {
          ...previousProfile,
          isFollowing: true,
          followersCount: previousProfile.followersCount + 1,
        })
      }

      // Optimistic update on search results
      queryClient.setQueriesData<FollowUser[]>(
        { queryKey: [...socialKeys.all, 'search'] },
        (old) => old?.map((u) => u.id === userId ? { ...u, isFollowing: true } : u)
      )

      return { previousProfile }
    },
    onError: (_err, userId, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(socialKeys.profile(userId), context.previousProfile)
      }
      // Revert search results on real errors
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'search'] })
    },
    onSettled: (_data, _err, userId) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.following(userId) })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'search'] })
    },
  })
}

export function useUnfollowUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: number) => {
      try {
        return await apiUnfollowUser(userId);
      } catch (err: any) {
        // 404 = not following — treat as success
        if (err?.status === 404 || err?.message?.includes('Not following')) {
          return { following: false };
        }
        throw err;
      }
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: socialKeys.profile(userId) })
      await queryClient.cancelQueries({ queryKey: socialKeys.all })

      const previousProfile = queryClient.getQueryData<UserProfile>(socialKeys.profile(userId))

      if (previousProfile) {
        queryClient.setQueryData<UserProfile>(socialKeys.profile(userId), {
          ...previousProfile,
          isFollowing: false,
          followersCount: Math.max(0, previousProfile.followersCount - 1),
        })
      }

      // Optimistic update on search results
      queryClient.setQueriesData<FollowUser[]>(
        { queryKey: [...socialKeys.all, 'search'] },
        (old) => old?.map((u) => u.id === userId ? { ...u, isFollowing: false } : u)
      )

      return { previousProfile }
    },
    onError: (_err, userId, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(socialKeys.profile(userId), context.previousProfile)
      }
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'search'] })
    },
    onSettled: (_data, _err, userId) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.following(userId) })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'search'] })
    },
  })
}

