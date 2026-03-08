import { apiClient } from './client'
import type { UserProfile, UserPost, FollowUser } from '../types'

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

export async function getFeed(): Promise<UserPost[]> {
  return apiClient<UserPost[]>('/feed')
}

export async function getUserPosts(userId: number): Promise<UserPost[]> {
  return apiClient<UserPost[]>(`/users/${userId}/posts`)
}
