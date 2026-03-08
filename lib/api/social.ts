import { apiClient } from './client'
import type { UserProfile, UserPost, FollowUser, PostComment, SkillTrophy } from '../types'

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

export async function getUserPosts(userId: number): Promise<UserPost[]> {
  return apiClient<UserPost[]>(`/users/${userId}/posts`)
}

export async function getPostComments(postId: number): Promise<PostComment[]> {
  return apiClient<PostComment[]>(`/posts/${postId}/comments`)
}

export async function addComment(postId: number, content: string): Promise<PostComment> {
  return apiClient<PostComment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  })
}

export async function deleteComment(postId: number, commentId: number): Promise<void> {
  return apiClient<void>(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
}

export async function getUserSkillTrophies(userId: number): Promise<SkillTrophy[]> {
  return apiClient<SkillTrophy[]>(`/users/${userId}/skill-trophies`)
}
