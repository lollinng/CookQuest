'use client'

import { useState } from 'react'
import { Check, Lock, Star, Camera } from 'lucide-react'
import type { Recipe } from '@/lib/types'
import Link from 'next/link'

export type ColorConfig = {
  node: string
  nodeHover: string
  glow: string
  shadow: string
  ring: string
  accent: string
  banner: string
}

interface PathNodeProps {
  recipe: Recipe
  isCompleted: boolean
  isLocked: boolean
  isCurrent: boolean
  index: number
  colors: ColorConfig
  onToggle: (id: string) => void
  labelSide: 'left' | 'right'
  gateMessage?: string
}

export function PathNode({
  recipe,
  isCompleted,
  isLocked,
  isCurrent,
  index,
  colors,
  onToggle,
  labelSide,
  gateMessage,
}: PathNodeProps) {
  const [isPressed, setIsPressed] = useState(false)
  const isCheckpoint = index % 3 === 0

  const nodeSize = isCheckpoint ? 'w-24 h-24' : 'w-20 h-20'
  const innerSize = isCheckpoint ? 'w-20 h-20' : 'w-16 h-16'

  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) return
    e.preventDefault()
    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 200)
  }

  const nodeContent = (
    <div className="relative">
      {/* The node circle */}
      <div
        className={`
          ${nodeSize} rounded-full flex items-center justify-center
          transition-all duration-150 relative
          ${isPressed ? 'scale-90' : ''}
          ${isLocked
            ? 'bg-gray-700 shadow-[0_8px_0_0_rgb(55,65,81)] cursor-not-allowed'
            : isCompleted
              ? 'bg-green-500 shadow-[0_8px_0_0_rgb(22,101,52)]'
              : `${colors.node} ${colors.shadow} ${colors.nodeHover} cursor-pointer`
          }
          ${isCurrent && !isCompleted ? `${colors.glow} ring-4 ${colors.ring} animate-pulse` : ''}
        `}
        onMouseDown={handleClick}
        onMouseUp={() => setIsPressed(false)}
      >
        <div className={`
          ${innerSize} rounded-full flex items-center justify-center
          ${isLocked
            ? 'bg-gray-600'
            : isCompleted
              ? 'bg-green-400'
              : 'bg-white/10'
          }
        `}>
          {isLocked ? (
            <Lock className="size-8 text-cq-text-muted" />
          ) : isCompleted ? (
            <Check className="size-10 text-white stroke-[3]" />
          ) : isCheckpoint ? (
            <Star className="size-10 text-white/90 fill-white/20" />
          ) : (
            <span className="text-4xl select-none">{recipe.emoji || '🍳'}</span>
          )}
        </div>
      </div>

      {/* Stars above checkpoints */}
      {isCheckpoint && isCompleted && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1">
          <Star className="size-5 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
          <Star className="size-6 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
          <Star className="size-5 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
        </div>
      )}

      {/* START indicator */}
      {isCurrent && !isCompleted && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2">
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold text-white ${colors.node} animate-bounce`}>
            START
          </div>
        </div>
      )}

      {/* Side label */}
      <div className={`absolute top-1/2 -translate-y-1/2 w-[120px] ${
        labelSide === 'right'
          ? 'left-full ml-4 text-left'
          : 'right-full mr-4 text-right'
      }`}>
        <div className={`text-sm font-semibold leading-tight ${
          isLocked ? 'text-cq-text-muted' : isCompleted ? 'text-green-400' : 'text-cq-text-primary'
        }`}>
          {recipe.title}
        </div>
        <div className={`text-xs mt-0.5 ${isLocked ? 'text-cq-text-muted' : 'text-cq-text-secondary'}`}>
          {recipe.time}
        </div>
        {!isLocked && !isCompleted && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(recipe.id) }}
            className={`
              mt-1.5 px-3 py-1 rounded-full text-xs font-bold
              ${colors.node} text-white ${colors.nodeHover}
              transition-all hover:scale-105 active:scale-95 shadow-lg
            `}
          >
            COMPLETE
          </button>
        )}
        {!isLocked && isCompleted && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(recipe.id) }}
            className="mt-1.5 px-3 py-1 rounded-full text-xs font-medium text-cq-text-muted hover:text-cq-text-primary border border-cq-border hover:border-cq-text-muted transition-all"
          >
            UNDO
          </button>
        )}
        {isLocked && gateMessage && (
          <div className="mt-1 text-xs text-amber-500 font-medium flex items-center gap-1">
            <Camera className="size-3" />
            {gateMessage}
          </div>
        )}
      </div>
    </div>
  )

  if (isLocked) return <>{nodeContent}</>

  return (
    <Link href={`/recipe/${recipe.id}`}>
      {nodeContent}
    </Link>
  )
}
