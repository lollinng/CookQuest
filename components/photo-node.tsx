'use client'

import { useRef, useState } from 'react'
import { Camera, Lock, Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-platform'
import { PhotoSourceSheet } from '@/components/ui/photo-source-sheet'

interface PhotoNodeProps {
  recipeId: string
  photoUrl: string | undefined
  isLocked: boolean
  isCompleted: boolean
  isCheckpoint: boolean
  onUpload: (recipeId: string, file: File) => void
  isUploading: boolean
  labelSide: 'left' | 'right'
  recipe: { title: string; time: string }
  photoNumber?: number
  totalPhotos?: number
}

export function PhotoNode({
  recipeId,
  photoUrl,
  isLocked,
  isCheckpoint,
  onUpload,
  isUploading,
  labelSide,
  recipe,
  photoNumber = 1,
  totalPhotos = 0,
}: PhotoNodeProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const hasPhoto = !!photoUrl

  // Larger nodes when photo is present so users can see their uploads
  const nodeSize = hasPhoto
    ? (isCheckpoint ? 'w-36 h-36' : 'w-32 h-32')
    : (isCheckpoint ? 'w-24 h-24' : 'w-20 h-20')
  const innerSize = isCheckpoint ? 'w-20 h-20' : 'w-16 h-16'

  // Rounded rectangle for photos, circle for empty/locked
  const nodeShape = hasPhoto ? 'rounded-2xl' : 'rounded-full'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!validTypes.includes(file.type)) {
        alert('Only JPEG, PNG, and WebP images are allowed')
        if (inputRef.current) inputRef.current.value = ''
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be under 5MB')
        if (inputRef.current) inputRef.current.value = ''
        return
      }
      onUpload(recipeId, file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="relative">
      {/* Node */}
      <div className={`${nodeSize} ${nodeShape} flex items-center justify-center relative ${hasPhoto ? 'transition-transform duration-200 hover:scale-105' : ''}`}>
        {isLocked ? (
          /* Locked node — same lock UI as learn mode */
          <>
            <div className={`${nodeSize} rounded-full bg-gray-300 shadow-[0_8px_0_0_rgb(209,213,219)] flex items-center justify-center`}>
              <div className={`${innerSize} rounded-full bg-gray-200 flex items-center justify-center`}>
                <Lock className="size-8 text-gray-400" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Photo or placeholder */}
            <div className={`
              ${nodeSize} ${nodeShape} overflow-hidden flex items-center justify-center
              ${hasPhoto
                ? 'border-4 border-amber-400 shadow-[0_8px_0_0_rgb(180,83,9)]'
                : 'border-[3px] border-dashed border-amber-400 shadow-[0_8px_0_0_rgb(180,83,9)] bg-amber-50'
              }
            `}>
              {hasPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="size-8 text-amber-400/70" />
              )}
            </div>

            {/* Photo number badge */}
            {hasPhoto && totalPhotos > 0 && (
              <div className="absolute top-0 left-0 bg-black/60 text-white text-xs font-medium rounded-full px-1.5 py-0.5 -translate-x-1 -translate-y-1">
                {photoNumber}/{totalPhotos > 3 ? 3 : totalPhotos}
              </div>
            )}

            {/* Upload button overlay at bottom-right */}
            <button
              onClick={() => isMobile ? setSheetOpen(true) : inputRef.current?.click()}
              disabled={isUploading}
              className={`
                absolute bottom-0 right-0 rounded-full bg-amber-500 hover:bg-amber-400 text-white
                flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 border-2 border-white
                ${hasPhoto ? 'w-9 h-9' : 'w-7 h-7'}
              `}
              title={hasPhoto ? 'Change photo' : 'Upload photo'}
            >
              {isUploading ? (
                <Loader2 className={`${hasPhoto ? 'size-4' : 'size-3.5'} animate-spin`} />
              ) : (
                <Camera className={hasPhoto ? 'size-4' : 'size-3.5'} />
              )}
            </button>

            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
            />

            {isMobile && (
              <PhotoSourceSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onFileSelected={(file) => onUpload(recipeId, file)}
              />
            )}
          </>
        )}
      </div>

      {/* Side label */}
      <div className={`absolute top-1/2 -translate-y-1/2 ${hasPhoto ? 'w-[140px]' : 'w-[120px]'} ${
        labelSide === 'right'
          ? `left-full ${hasPhoto ? 'ml-5' : 'ml-4'} text-left`
          : `right-full ${hasPhoto ? 'mr-5' : 'mr-4'} text-right`
      }`}>
        <div className={`text-sm font-semibold leading-tight ${
          isLocked ? 'text-stone-400' : 'text-stone-700'
        }`}>
          {recipe.title}
        </div>
        <div className={`text-xs mt-0.5 ${isLocked ? 'text-stone-300' : 'text-stone-500'}`}>
          {recipe.time}
        </div>
        {!isLocked && !hasPhoto && (
          <div className="mt-1 text-xs text-amber-600 font-medium">
            {totalPhotos > 0 ? `Add photo ${photoNumber}/3` : 'Tap camera to add photo'}
          </div>
        )}
      </div>
    </div>
  )
}
