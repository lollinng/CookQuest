'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, CameraOff, ChevronDown, ChevronUp, Lightbulb, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppealForm } from '@/components/appeal-form'
import type { PhotoVerification } from '@/lib/types'

interface VerificationResultProps {
  verification: PhotoVerification
  verificationId?: number
  onRetry?: () => void
  onContinue?: () => void
}

export function VerificationResult({
  verification,
  verificationId,
  onRetry,
  onContinue,
}: VerificationResultProps) {
  const [tipsExpanded, setTipsExpanded] = useState(verification.verdict === 'rejected')
  const [appealOpen, setAppealOpen] = useState(false)
  const [appealSubmitted, setAppealSubmitted] = useState(false)
  const { verdict, xpAwarded, feedback, tips, canAppeal } = verification

  const appealButton = canAppeal && verificationId && !appealSubmitted ? (
    <button
      onClick={() => setAppealOpen(true)}
      className="w-full text-center text-sm text-cq-text-muted hover:text-cq-text-secondary transition-colors"
    >
      Appeal this decision
    </button>
  ) : appealSubmitted ? (
    <div className="flex items-center justify-center gap-1.5 text-sm text-amber-400">
      <Clock className="size-3.5" />
      Appeal pending
    </div>
  ) : null

  const appealSheet = verificationId ? (
    <AppealForm
      open={appealOpen}
      onOpenChange={setAppealOpen}
      verificationId={verificationId}
      onSubmitted={() => setAppealSubmitted(true)}
    />
  ) : null

  if (verdict === 'accepted') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="size-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <CheckCircle2 className="size-9 text-green-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">Verified! +{xpAwarded} XP</p>
          <p className="text-sm text-cq-text-secondary mt-1">{feedback}</p>
        </div>
        <Button
          onClick={onContinue}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl"
        >
          Continue
        </Button>
      </div>
    )
  }

  if (verdict === 'marginal') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="size-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <AlertTriangle className="size-9 text-amber-400" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">+{xpAwarded} XP (reduced)</p>
          <p className="text-sm text-cq-text-secondary mt-1">{feedback}</p>
          <p className="text-xs text-cq-text-muted mt-1">This post will stay private</p>
        </div>

        {tips && tips.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setTipsExpanded(!tipsExpanded)}
              className="flex items-center gap-2 text-sm text-cq-text-secondary hover:text-cq-text-primary transition-colors"
            >
              <Lightbulb className="size-4" />
              Tips to improve
              {tipsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
            {tipsExpanded && (
              <ul className="mt-2 space-y-1.5 bg-cq-surface rounded-xl p-3 border border-cq-border">
                {tips.map((tip, i) => (
                  <li key={i} className="text-sm text-cq-text-secondary flex gap-2">
                    <span className="text-cq-text-muted shrink-0">-</span>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="w-full space-y-2">
          <Button
            onClick={onContinue}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl"
          >
            Got it
          </Button>
          {appealButton}
        </div>
        {appealSheet}
      </div>
    )
  }

  // Rejected
  return (
    <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="size-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <CameraOff className="size-9 text-rose-400" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-rose-400">We couldn&apos;t verify this photo</p>
        <p className="text-sm text-cq-text-muted mt-1">No XP awarded this time</p>
        <p className="text-sm text-cq-text-secondary mt-2">{feedback}</p>
      </div>

      {tips && tips.length > 0 && (
        <ul className="w-full space-y-1.5 bg-cq-surface rounded-xl p-3 border border-cq-border">
          {tips.map((tip, i) => (
            <li key={i} className="text-sm text-cq-text-secondary flex gap-2">
              <Lightbulb className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-cq-text-secondary">
        Don&apos;t worry — try a close-up of your actual dish!
      </p>

      <div className="w-full space-y-2">
        <Button
          onClick={onRetry}
          className="w-full bg-cq-surface hover:bg-cq-surface/80 text-cq-text-primary border border-cq-border font-bold py-3 rounded-xl"
        >
          Try Again
        </Button>
        {appealButton}
      </div>
      {appealSheet}
    </div>
  )
}
