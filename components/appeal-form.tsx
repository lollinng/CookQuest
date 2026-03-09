'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useCreateAppeal } from '@/hooks/use-appeals'

interface AppealFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  verificationId: number
  onSubmitted?: () => void
  onCancel?: () => void
}

const MAX_REASON = 500

export function AppealForm({
  open,
  onOpenChange,
  verificationId,
  onSubmitted,
  onCancel,
}: AppealFormProps) {
  const [reason, setReason] = useState('')
  const createAppeal = useCreateAppeal()

  const handleSubmit = async () => {
    try {
      await createAppeal.mutateAsync({
        verificationId,
        reason: reason.trim() || undefined,
      })
      toast.success('Appeal submitted — we\'ll review it soon')
      setReason('')
      onOpenChange(false)
      onSubmitted?.()
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e?.status === 429) {
        toast.error('You\'ve reached the daily appeal limit')
      } else {
        toast.error(e?.message || 'Failed to submit appeal')
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-cq-bg border-cq-border pb-8">
        <SheetHeader className="text-center pb-1">
          <SheetTitle className="text-cq-text-primary text-lg">
            Appeal Photo Verification
          </SheetTitle>
          <SheetDescription className="text-cq-text-secondary text-sm">
            Tell us why this photo should be accepted
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 px-2">
          <div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              placeholder="Optional: explain why this photo is valid..."
              rows={3}
              className="w-full rounded-xl border border-cq-border bg-cq-surface px-3 py-2.5 text-sm text-cq-text-primary placeholder:text-cq-text-muted focus:outline-none focus:ring-2 focus:ring-ring/50 resize-none"
            />
            <div className="text-right text-xs text-cq-text-muted mt-0.5">
              {reason.length}/{MAX_REASON}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={createAppeal.isPending}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl"
          >
            {createAppeal.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Appeal'
            )}
          </Button>

          <button
            onClick={() => {
              setReason('')
              onOpenChange(false)
              onCancel?.()
            }}
            className="w-full text-center text-sm text-cq-text-muted hover:text-cq-text-secondary transition-colors py-1"
          >
            Cancel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
