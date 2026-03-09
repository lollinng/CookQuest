'use client'

import { Camera, Lock } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface GatePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipeName: string
  recipeEmoji?: string
  photosPosted: number
  photosNeededForNextUnlock: number
  skillColor?: string
  onGoToPost?: () => void
}

export function GatePrompt({
  open,
  onOpenChange,
  recipeName,
  recipeEmoji,
  photosPosted,
  photosNeededForNextUnlock,
  skillColor = 'blue',
  onGoToPost,
}: GatePromptProps) {
  const remaining = Math.max(0, photosNeededForNextUnlock - photosPosted);
  const progress = photosNeededForNextUnlock > 0
    ? Math.min(100, (photosPosted / photosNeededForNextUnlock) * 100)
    : 100;

  const colorMap: Record<string, { bar: string; btn: string }> = {
    blue: { bar: 'bg-blue-500', btn: 'bg-blue-500 hover:bg-blue-600' },
    orange: { bar: 'bg-orange-500', btn: 'bg-orange-500 hover:bg-orange-600' },
    purple: { bar: 'bg-purple-500', btn: 'bg-purple-500 hover:bg-purple-600' },
    emerald: { bar: 'bg-emerald-500', btn: 'bg-emerald-500 hover:bg-emerald-600' },
    amber: { bar: 'bg-amber-500', btn: 'bg-amber-500 hover:bg-amber-600' },
  };
  const colors = colorMap[skillColor] || colorMap.blue;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-cq-bg border-cq-border pb-8">
        <SheetHeader className="text-center pb-2">
          <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-cq-surface flex items-center justify-center">
            <Lock className="size-6 text-cq-text-muted" />
          </div>
          <SheetTitle className="text-cq-text-primary text-lg">
            {recipeEmoji && <span className="mr-1">{recipeEmoji}</span>}
            {recipeName}
          </SheetTitle>
          <SheetDescription className="text-cq-text-secondary text-sm">
            Cook &amp; post a dish to unlock this recipe
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 px-2">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-cq-text-muted">
              <span>{photosPosted} photo{photosPosted !== 1 ? 's' : ''} posted</span>
              <span>{remaining} more to unlock</span>
            </div>
            <div className="w-full h-2.5 bg-cq-track rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <Button
            onClick={() => {
              onOpenChange(false);
              onGoToPost?.();
            }}
            className={`w-full ${colors.btn} text-white font-bold py-3 rounded-xl`}
          >
            <Camera className="size-4 mr-2" />
            Post a dish to unlock
          </Button>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full text-center text-sm text-cq-text-muted hover:text-cq-text-secondary transition-colors py-1"
          >
            Maybe later
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
