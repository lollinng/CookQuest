'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  label?: string
  size?: 'sm' | 'md' | 'lg'
  maxStars?: number
}

const SIZE_MAP = {
  sm: 'size-5',
  md: 'size-6',
  lg: 'size-7',
}

export function StarRating({
  value,
  onChange,
  label,
  size = 'md',
  maxStars = 5,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const iconSize = SIZE_MAP[size]

  return (
    <div className="space-y-1">
      {label && (
        <span className="text-sm text-cq-text-secondary">{label}</span>
      )}
      <div
        className="flex gap-1"
        onMouseLeave={() => setHovered(0)}
      >
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1
          const filled = starValue <= (hovered || value)

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => onChange(starValue)}
              onMouseEnter={() => setHovered(starValue)}
              className="transition-transform hover:scale-110 active:scale-95"
            >
              <Star
                className={`${iconSize} transition-colors ${
                  filled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-gray-300'
                }`}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
