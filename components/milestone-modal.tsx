'use client'

import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface MilestoneModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  emoji?: string
  autoDismissMs?: number
}

export function MilestoneModal({
  open,
  onOpenChange,
  title,
  description,
  emoji,
  autoDismissMs = 3000,
}: MilestoneModalProps) {
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => onOpenChange(false), autoDismissMs)
    return () => clearTimeout(timer)
  }, [open, autoDismissMs, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs bg-cq-bg border-cq-border text-center rounded-3xl">
        <div className="flex flex-col items-center gap-3 py-4">
          {emoji && (
            <div className="text-6xl animate-bounce">{emoji}</div>
          )}
          <DialogTitle className="text-xl font-black text-cq-text-primary">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-cq-text-secondary">
              {description}
            </DialogDescription>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
