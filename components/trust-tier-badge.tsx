'use client'

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string; description: string }> = {
  new: {
    label: 'New Cook',
    color: 'text-cq-text-muted',
    bg: 'bg-cq-surface',
    description: 'Upload verified photos to build trust',
  },
  trusted: {
    label: 'Trusted Cook',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    description: 'Your photos get a verification bonus',
  },
  veteran: {
    label: 'Veteran Cook',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    description: 'Maximum trust — your photos get a bigger verification bonus',
  },
}

interface TrustTierBadgeProps {
  tier: string
  className?: string
}

export function TrustTierBadge({ tier, className }: TrustTierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.new

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-transparent ${config.bg} ${config.color} ${className || ''}`}
      title={config.description}
    >
      {config.label}
    </span>
  )
}
