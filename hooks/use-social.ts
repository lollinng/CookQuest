import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import type { UserProfile, UserPost, FollowUser, PostComment, SkillTrophy, LeaderboardEntry, Notification } from '@/lib/types'
import {
  followUser as apiFollowUser,
  unfollowUser as apiUnfollowUser,
  getUserProfile,
  getUserFollowers,
  getUserFollowing,
  searchUsers,
  getFeed,
  getWorldFeed,
  getUserPosts,
  getPostComments,
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  createPost as apiCreatePost,
  deletePost as apiDeletePost,
  toggleCommentLike as apiToggleCommentLike,
  togglePostLike as apiTogglePostLike,
  getUserSkillTrophies,
  uploadAvatar as apiUploadAvatar,
  getWorldLeaderboard,
  getFriendsLeaderboard,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead as apiMarkAllRead,
} from '@/lib/api/social'

// Query keys
export const socialKeys = {
  all: ['social'] as const,
  feed: () => [...socialKeys.all, 'feed'] as const,
  worldFeed: () => [...socialKeys.all, 'feed', 'world'] as const,
  profile: (userId: number) => [...socialKeys.all, 'profile', userId] as const,
  followers: (userId: number) => [...socialKeys.all, 'followers', userId] as const,
  following: (userId: number) => [...socialKeys.all, 'following', userId] as const,
  search: (q: string) => [...socialKeys.all, 'search', q] as const,
  userPosts: (userId: number) => [...socialKeys.all, 'posts', userId] as const,
  comments: (postId: number) => [...socialKeys.all, 'comments', postId] as const,
  trophies: (userId: number) => [...socialKeys.all, 'trophies', userId] as const,
}

// ── Queries ──

export function useFeed(limit: number = 30) {
  return useQuery({
    queryKey: [...socialKeys.feed(), limit],
    queryFn: () => getFeed(limit),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useWorldFeed(limit: number = 30, difficulty?: string) {
  return useQuery({
    queryKey: [...socialKeys.worldFeed(), limit, difficulty ?? 'all'],
    queryFn: () => getWorldFeed(limit, difficulty),
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

export function useUserSkillTrophies(userId: number) {
  return useQuery({
    queryKey: socialKeys.trophies(userId),
    queryFn: () => getUserSkillTrophies(userId),
    enabled: userId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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

export function useWorldLeaderboard(limit = 10) {
  return useQuery({
    queryKey: [...socialKeys.all, 'leaderboard', 'world', limit],
    queryFn: () => getWorldLeaderboard(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useFriendsLeaderboard(limit = 10) {
  return useQuery({
    queryKey: [...socialKeys.all, 'leaderboard', 'friends', limit],
    queryFn: () => getFriendsLeaderboard(limit),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
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
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiCreatePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

export function useUploadPhoto() {
  return useMutation({
    mutationFn: (file: File) => {
      // Dynamic import to avoid circular dependency issues
      return import('@/lib/api/uploads').then(m => m.uploadPhoto(file))
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: number) => apiDeletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: number; commentId: number }) =>
      apiToggleCommentLike(postId, commentId),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(postId) })
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
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
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
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.followers(userId) })
      queryClient.invalidateQueries({ queryKey: socialKeys.following(userId) })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'search'] })
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: apiUploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'profile'] })
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

export function useTogglePostLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (postId: number) => apiTogglePostLike(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.worldFeed() })
      queryClient.invalidateQueries({ queryKey: socialKeys.feed() })
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'posts'] })
    },
  })
}

// ── Notifications ──

export function useNotifications(limit: number = 30) {
  return useQuery({
    queryKey: [...socialKeys.all, 'notifications', limit],
    queryFn: () => getNotifications(limit),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: [...socialKeys.all, 'notifications', 'unread-count'],
    queryFn: () => getUnreadNotificationCount(),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => apiMarkAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...socialKeys.all, 'notifications'] })
    },
  })
}

