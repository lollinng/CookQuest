import { uploadFile } from './upload-helpers'

export async function uploadPhoto(file: File): Promise<{ photoUrl: string }> {
  return uploadFile('/uploads/photo', file)
}
