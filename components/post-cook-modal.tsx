'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, Unlock, Eye, EyeOff } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-platform'
import { PhotoSourceSheet } from '@/components/ui/photo-source-sheet'
import { Button } from '@/components/ui/button'
import { StarRating } from '@/components/ui/star-rating'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useCreatePost, useUploadPhoto } from '@/hooks/use-social'
import { useUploadRecipePhoto } from '@/hooks/use-recipes'
import { useQueryClient } from '@tanstack/react-query'
import { progressionKeys } from '@/hooks/use-progression'
import type { Recipe } from '@/lib/types'

interface PostCookModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipe: Recipe | null
  onPosted?: () => void
}

const MAX_CAPTION = 300
const MAX_FILE_SIZE = 5 * 1024 * 1024

export function PostCookModal({ open, onOpenChange, recipe, onPosted }: PostCookModalProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [tasteRating, setTasteRating] = useState(0)
  const [difficultyRating, setDifficultyRating] = useState(0)
  const [isPrivate, setIsPrivate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createPost = useCreatePost()
  const uploadPhoto = useUploadPhoto()
  const uploadRecipePhoto = useUploadRecipePhoto()
  const queryClient = useQueryClient()

  const isSubmitting = createPost.isPending || uploadPhoto.isPending || uploadRecipePhoto.isPending
  const canPost = !!photo && !isSubmitting

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setError('Photo must be under 5MB')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images allowed')
      return
    }

    setError(null)
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!canPost || !recipe) return
    setError(null)

    try {
      // Upload recipe photo (for progression gating)
      await uploadRecipePhoto.mutateAsync({ recipeId: recipe.id, file: photo! })

      // Upload to general photos for the feed post
      const result = await uploadPhoto.mutateAsync(photo!)

      // Create the feed post (unless private)
      if (!isPrivate) {
        await createPost.mutateAsync({
          postType: 'photo_upload',
          recipeId: recipe.id,
          photoUrl: result.photoUrl,
          caption: caption.trim() || undefined,
        })
      }

      // Invalidate progression data so unlock status refreshes
      queryClient.invalidateQueries({ queryKey: progressionKeys.all })

      resetForm()
      onOpenChange(false)
      onPosted?.()
    } catch (err: any) {
      setError(err.message || 'Failed to post')
    }
  }

  const resetForm = () => {
    removePhoto()
    setCaption('')
    setTasteRating(0)
    setDifficultyRating(0)
    setIsPrivate(false)
    setError(null)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isSubmitting) {
      resetForm()
    }
    onOpenChange(isOpen)
  }

  if (!recipe) return null

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-cq-bg border-cq-border max-h-[90vh] overflow-y-auto pb-8">
        <SheetHeader className="text-center pb-1">
          <SheetTitle className="text-cq-text-primary text-lg">
            Show us what you cooked!
          </SheetTitle>
          <SheetDescription className="text-cq-text-secondary text-sm">
            Post your dish to unlock more recipes
          </SheetDescription>
        </SheetHeader>

        <div className="mt-3 space-y-4 px-2">
          {/* Recipe pill */}
          <div className="flex items-center gap-2 rounded-full bg-cq-surface border border-cq-border px-4 py-2 w-fit mx-auto">
            <span className="text-lg">{recipe.emoji || '🍽️'}</span>
            <span className="text-sm font-medium text-cq-text-primary">{recipe.title}</span>
          </div>

          {/* Photo upload */}
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Your dish"
                className="w-full max-h-56 object-cover"
              />
              <button
                onClick={removePhoto}
                className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => isMobile ? setPhotoSheetOpen(true) : fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-cq-border hover:border-cq-text-muted py-8 flex flex-col items-center gap-2 transition-colors"
            >
              <Camera className="size-8 text-cq-text-muted" />
              <span className="text-sm text-cq-text-muted">Tap to add a photo</span>
              <span className="text-xs text-cq-text-muted">or upload from gallery</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          {isMobile && (
            <PhotoSourceSheet
              open={photoSheetOpen}
              onOpenChange={setPhotoSheetOpen}
              onFileSelected={(file) => {
                setError(null);
                setPhoto(file);
                setPhotoPreview(URL.createObjectURL(file));
              }}
            />
          )}

          {/* Caption */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="How did it go?"
              rows={2}
              className="w-full rounded-xl border border-cq-border bg-cq-surface px-3 py-2.5 text-sm text-cq-text-primary placeholder:text-cq-text-muted focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
            <div className="text-right text-xs text-cq-text-muted mt-0.5">
              {caption.length}/{MAX_CAPTION}
            </div>
          </div>

          {/* Ratings */}
          <div className="flex gap-6">
            <StarRating
              value={tasteRating}
              onChange={setTasteRating}
              label="How'd it taste?"
              size="md"
            />
            <StarRating
              value={difficultyRating}
              onChange={setDifficultyRating}
              label="How hard was it?"
              size="md"
            />
          </div>

          {/* Private toggle */}
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className="flex items-center gap-2 text-sm text-cq-text-secondary hover:text-cq-text-primary transition-colors"
          >
            {isPrivate ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
            {isPrivate
              ? 'Private — counts toward progress only'
              : 'Post to community feed'
            }
          </button>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!canPost}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {uploadRecipePhoto.isPending ? 'Uploading...' : 'Posting...'}
              </>
            ) : (
              <>
                <Unlock className="size-4 mr-2" />
                Post &amp; unlock more recipes
              </>
            )}
          </Button>

          <button
            onClick={() => handleOpenChange(false)}
            className="w-full text-center text-sm text-cq-text-muted hover:text-cq-text-secondary transition-colors py-1"
          >
            Skip for now
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
