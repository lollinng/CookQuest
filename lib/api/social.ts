import { apiClient } from './client'
import { uploadFile } from './upload-helpers'
import type { UserProfile, UserPost, FollowUser, PostComment, SkillTrophy, LeaderboardEntry, Notification } from '../types'

export async function followUser(userId: number): Promise<{ following: boolean }> {
  return apiClient<{ following: boolean }>(`/users/${userId}/follow`, { method: 'POST' })
}

export async function unfollowUser(userId: number): Promise<{ following: boolean }> {
  return apiClient<{ following: boolean }>(`/users/${userId}/follow`, { method: 'DELETE' })
}

export async function getUserProfile(userId: number): Promise<UserProfile> {
  return apiClient<UserProfile>(`/users/${userId}`)
}

export async function getUserFollowers(userId: number): Promise<FollowUser[]> {
  return apiClient<FollowUser[]>(`/users/${userId}/followers`)
}

export async function getUserFollowing(userId: number): Promise<FollowUser[]> {
  return apiClient<FollowUser[]>(`/users/${userId}/following`)
}

export async function searchUsers(query: string): Promise<FollowUser[]> {
  return apiClient<FollowUser[]>('/users/search', {
    params: { q: query },
  })
}

export async function getFeed(limit?: number): Promise<UserPost[]> {
  return apiClient<UserPost[]>('/feed', {
    params: limit ? { limit: String(limit) } : undefined,
  })
}

export async function getWorldFeed(limit?: number, difficulty?: string): Promise<UserPost[]> {
  return apiClient<UserPost[]>('/feed/world', {
    params: {
      ...(limit ? { limit: String(limit) } : {}),
      ...(difficulty ? { difficulty } : {}),
    },
  })
}

export async function getUserPosts(userId: number): Promise<UserPost[]> {
  return apiClient<UserPost[]>(`/users/${userId}/posts`)
}

export async function getPostComments(postId: number): Promise<PostComment[]> {
  return apiClient<PostComment[]>(`/posts/${postId}/comments`)
}

export async function addComment(postId: number, content: string): Promise<PostComment> {
  return apiClient<PostComment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: { content },
  })
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  return apiClient<void>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
}

export async function getUserSkillTrophies(userId: number): Promise<SkillTrophy[]> {
  return apiClient<SkillTrophy[]>(`/users/${userId}/skill-trophies`)
}

export async function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  return uploadFile('/users/me/avatar', file, 'avatar', 'PATCH')
}

export async function deleteAvatar(): Promise<void> {
  return apiClient<void>('/users/me/avatar', { method: 'DELETE' })
}

export async function createPost(data: {
  postType: 'recipe_completed' | 'photo_upload' | 'milestone'
  recipeId?: string
  photoUrl?: string
  caption?: string
}): Promise<UserPost> {
  return apiClient<UserPost>('/posts', { method: 'POST', body: data })
}

export async function deletePost(postId: number): Promise<void> {
  return apiClient<void>(`/posts/${postId}`, { method: 'DELETE' })
}

export async function toggleCommentLike(postId: number, commentId: number): Promise<{ liked: boolean; likesCount: number }> {
  return apiClient<{ liked: boolean; likesCount: number }>(`/posts/${postId}/comments/${commentId}/like`, { method: 'POST' })
}

export async function getWorldLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  return apiClient<LeaderboardEntry[]>('/leaderboard/world', {
    params: { limit: String(limit) },
  })
}

export async function getFriendsLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  return apiClient<LeaderboardEntry[]>('/leaderboard/friends', {
    params: { limit: String(limit) },
  })
}

export async function togglePostLike(postId: number): Promise<{ liked: boolean; likesCount: number }> {
  return apiClient<{ liked: boolean; likesCount: number }>(`/posts/${postId}/like`, { method: 'POST' })
}

export async function getNotifications(limit?: number): Promise<Notification[]> {
  return apiClient<Notification[]>('/notifications', {
    params: limit ? { limit: String(limit) } : undefined,
  })
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  return apiClient<{ count: number }>('/notifications/unread-count')
}

export async function markNotificationRead(id: number): Promise<void> {
  return apiClient<void>(`/notifications/${id}/read`, { method: 'PATCH' })
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiClient<void>('/notifications/read-all', { method: 'PATCH' })
}
