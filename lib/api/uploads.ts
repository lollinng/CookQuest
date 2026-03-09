import { API_BASE_URL, getToken, ApiError } from './client'

export async function uploadPhoto(file: File): Promise<{ photoUrl: string }> {
  const formData = new FormData()
  formData.append('photo', file)

  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}/uploads/photo`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })

  const json = await res.json()
  if (!json.success) {
    throw new ApiError(json.error?.message || 'Photo upload failed', res.status)
  }
  return json.data
}
