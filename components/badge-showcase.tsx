'use client'

import { useState } from 'react'
import { Award } from 'lucide-react'
import { useUserBadges } from '@/hooks/use-progression'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Badge } from '@/lib/types'

interface BadgeShowcaseProps {
  maxVisible?: number
}

export function BadgeShowcase({ maxVisible = 4 }: BadgeShowcaseProps) {
  const { data: badges } = useUserBadges()
  const [showAll, setShowAll] = useState(false)

  if (!badges || badges.length === 0) return null

  const visible = badges.slice(0, maxVisible)
  const remaining = badges.length - maxVisible

  return (
    <>
      <button
        onClick={() => setShowAll(true)}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        {visible.map((badge) => (
          <span
            key={badge.key}
            className="inline-flex items-center justify-center size-7 rounded-full bg-cq-surface border border-cq-border text-sm"
            title={badge.name}
          >
            {badge.emoji}
          </span>
        ))}
        {remaining > 0 && (
          <span className="text-xs text-cq-text-muted font-medium">
            +{remaining}
          </span>
        )}
      </button>

      <Sheet open={showAll} onOpenChange={setShowAll}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-cq-bg border-cq-border pb-8 max-h-[70vh] overflow-y-auto">
          <SheetHeader className="text-center pb-2">
            <div className="mx-auto mb-2 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Award className="size-6 text-amber-500" />
            </div>
            <SheetTitle className="text-cq-text-primary">
              Your Badges ({badges.length})
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-2 gap-3 px-2">
            {badges.map((badge) => (
              <BadgeCard key={badge.key} badge={badge} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-cq-surface border border-cq-border p-3">
      <span className="text-2xl">{badge.emoji}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-cq-text-primary truncate">{badge.name}</p>
        {badge.earnedAt && (
          <p className="text-xs text-cq-text-muted">
            {new Date(badge.earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  )
}
