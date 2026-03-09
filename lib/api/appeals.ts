import { apiClient } from './client'

export interface Appeal {
  id: number
  verificationId: number
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export function createAppeal(verificationId: number, reason?: string) {
  return apiClient<{ appeal: Appeal }>('/photos/appeals', {
    method: 'POST',
    body: JSON.stringify({ verificationId, reason }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function getMyAppeals() {
  return apiClient<{ appeals: Appeal[] }>('/photos/appeals/mine')
}
