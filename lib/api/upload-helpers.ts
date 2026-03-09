import { API_BASE_URL, ApiError } from './client'

export async function uploadFile<T = Record<string, unknown>>(
  endpoint: string,
  file: File,
  fieldName: string = 'photo',
  method: 'POST' | 'PATCH' = 'POST',
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const formData = new FormData()
  formData.append(fieldName, file)

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: extraHeaders,
    body: formData,
    credentials: 'include', // httpOnly cookies handle auth
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(json.error?.message || 'Upload failed', res.status)
  }
  return json.data ?? json
}
