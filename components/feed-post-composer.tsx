'use client';

import { useState, useRef } from 'react';
import { Camera, X, Search, LinkIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-platform';
import { PhotoSourceSheet } from '@/components/ui/photo-source-sheet';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { useCreatePost, useUploadPhoto } from '@/hooks/use-social';
import { getRecipes } from '@/lib/api/recipes';
import type { Recipe } from '@/lib/types';

interface FeedPostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

const MAX_CAPTION = 500;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function FeedPostComposer({ isOpen, onClose, onPostCreated }: FeedPostComposerProps) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [linkedRecipe, setLinkedRecipe] = useState<{ id: string; title: string; imageUrl?: string } | null>(null);
  const [showRecipePicker, setShowRecipePicker] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState('');
  const [recipeResults, setRecipeResults] = useState<Recipe[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const createPost = useCreatePost();
  const uploadPhoto = useUploadPhoto();

  const isSubmitting = createPost.isPending || uploadPhoto.isPending;
  const canPost = (photo || caption.trim().length > 0) && !isSubmitting;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('Photo must be under 5MB');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images allowed');
      return;
    }

    setError(null);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRecipeSearch = (query: string) => {
    setRecipeQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setRecipeResults([]);
      return;
    }

    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const data = await getRecipes({ search: query, limit: 6 });
        setRecipeResults(data.recipes.map((r: any) => ({
          ...r,
          imageUrl: r.image_url || r.imageUrl || '',
          xpReward: r.xp_reward || r.xpReward || 0,
          ingredients: r.ingredients || [],
          instructions: r.instructions || [],
        })));
      } catch {
        setRecipeResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const selectRecipe = (recipe: Recipe) => {
    setLinkedRecipe({ id: recipe.id, title: recipe.title, imageUrl: recipe.imageUrl });
    setShowRecipePicker(false);
    setRecipeQuery('');
    setRecipeResults([]);
  };

  const handleSubmit = async () => {
    if (!canPost) return;
    setError(null);

    try {
      let photoUrl: string | undefined;

      // Upload photo first if selected
      if (photo) {
        const result = await uploadPhoto.mutateAsync(photo);
        photoUrl = result.photoUrl;
      }

      // Determine post type
      const postType = photo ? 'photo_upload' : 'milestone';

      await createPost.mutateAsync({
        postType,
        recipeId: linkedRecipe?.id,
        photoUrl,
        caption: caption.trim() || undefined,
      });

      // Success — reset and close
      resetForm();
      onClose();
      onPostCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    }
  };

  const resetForm = () => {
    removePhoto();
    setCaption('');
    setLinkedRecipe(null);
    setShowRecipePicker(false);
    setRecipeQuery('');
    setRecipeResults([]);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      if (!isSubmitting) {
        resetForm();
        onClose();
      }
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-3">
          <DrawerTitle>New Post</DrawerTitle>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {/* Photo upload */}
          <div>
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Selected photo"
                  className="w-full max-h-64 object-cover"
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
                className="w-full rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/40 py-10 flex flex-col items-center gap-2 transition-colors"
              >
                <Camera className="size-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tap to add a photo</span>
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
          </div>

          {/* Caption */}
          <div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              placeholder="What did you cook?"
              rows={3}
              className="w-full rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {caption.length}/{MAX_CAPTION}
            </div>
          </div>

          {/* Recipe link */}
          <div>
            {linkedRecipe ? (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <LinkIcon className="size-4 text-amber-400 shrink-0" />
                <span className="flex-1 text-sm text-foreground truncate">{linkedRecipe.title}</span>
                <button
                  onClick={() => setLinkedRecipe(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowRecipePicker(!showRecipePicker)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkIcon className="size-4" />
                Link a recipe (optional)
                {showRecipePicker ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </button>
            )}

            {showRecipePicker && !linkedRecipe && (
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={recipeQuery}
                    onChange={(e) => handleRecipeSearch(e.target.value)}
                    placeholder="Search recipes..."
                    className="w-full rounded-lg border border-border bg-input-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                    autoFocus
                  />
                </div>

                {searchLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!searchLoading && recipeQuery.length >= 2 && recipeResults.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-3">No recipes found</p>
                )}

                {recipeResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {recipeResults.map((recipe) => (
                      <button
                        key={recipe.id}
                        onClick={() => selectRecipe(recipe)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        {recipe.imageUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            className="size-10 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <div className="size-10 rounded-md bg-muted flex items-center justify-center text-lg shrink-0">
                            {recipe.emoji || '🍽️'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{recipe.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{recipe.skill} &middot; {recipe.difficulty}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DrawerFooter className="border-t border-border pt-3">
          <Button
            onClick={handleSubmit}
            disabled={!canPost}
            className="w-full bg-primary text-primary-foreground hover:bg-cq-primary-hover"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                {uploadPhoto.isPending ? 'Uploading...' : 'Posting...'}
              </>
            ) : (
              'Post'
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
