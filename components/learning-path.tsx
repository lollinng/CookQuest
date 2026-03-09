'use client'

import { Star, Crown, Camera } from 'lucide-react'
import type { Recipe, RecipePhoto, SkillProgression } from '@/lib/types'
import { useState, useEffect, useRef } from 'react'
import { PhotoNode } from './photo-node'
import { PathNode, type ColorConfig } from './path-node'
import { ChefCharacter } from './chef-character'
import { GatePrompt } from './ui/gate-prompt'

interface LearningPathProps {
  recipes: Recipe[]
  isRecipeCompleted: (id: string) => boolean
  onToggleCompletion: (id: string) => void
  skillColor: string
  skillIcon: string
  skillName: string
  mode?: 'learn' | 'cookbook'
  userPhotos?: Map<string, RecipePhoto[]>
  onPhotoUpload?: (recipeId: string, file: File) => void
  uploadingRecipeId?: string | null
  progression?: SkillProgression
}

const COLOR_MAP: Record<string, ColorConfig> = {
  blue: {
    node: 'bg-blue-500',
    nodeHover: 'hover:bg-blue-400',
    glow: 'shadow-[0_0_30px_rgba(59,130,246,0.5)]',
    shadow: 'shadow-[0_8px_0_0_rgb(29,78,216)]',
    ring: 'ring-blue-400/50',
    accent: 'text-blue-400',
    banner: 'from-blue-600 to-blue-500',
  },
  orange: {
    node: 'bg-orange-500',
    nodeHover: 'hover:bg-orange-400',
    glow: 'shadow-[0_0_30px_rgba(249,115,22,0.5)]',
    shadow: 'shadow-[0_8px_0_0_rgb(194,65,12)]',
    ring: 'ring-orange-400/50',
    accent: 'text-orange-400',
    banner: 'from-orange-600 to-red-500',
  },
  purple: {
    node: 'bg-purple-500',
    nodeHover: 'hover:bg-purple-400',
    glow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]',
    shadow: 'shadow-[0_8px_0_0_rgb(107,33,168)]',
    ring: 'ring-purple-400/50',
    accent: 'text-purple-400',
    banner: 'from-purple-600 to-purple-500',
  },
  emerald: {
    node: 'bg-emerald-500',
    nodeHover: 'hover:bg-emerald-400',
    glow: 'shadow-[0_0_30px_rgba(16,185,129,0.5)]',
    shadow: 'shadow-[0_8px_0_0_rgb(4,120,87)]',
    ring: 'ring-emerald-400/50',
    accent: 'text-emerald-400',
    banner: 'from-emerald-600 to-emerald-500',
  },
  amber: {
    node: 'bg-amber-500',
    nodeHover: 'hover:bg-amber-400',
    glow: 'shadow-[0_0_30px_rgba(245,158,11,0.5)]',
    shadow: 'shadow-[0_8px_0_0_rgb(180,83,9)]',
    ring: 'ring-amber-400/50',
    accent: 'text-amber-400',
    banner: 'from-amber-600 to-amber-500',
  },
}

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [width, setWidth] = useState(600)
  useEffect(() => {
    function update() {
      if (ref.current) {
        setWidth(ref.current.clientWidth)
      } else {
        setWidth(Math.min(window.innerWidth - 32, 672))
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [ref])
  return width
}

const NODE_SPACING = 180
const COOKBOOK_NODE_SPACING = 240

function getNodePosition(index: number, containerWidth: number): { x: number } {
  const amplitude = Math.min(containerWidth * 0.3, 200)
  const pattern = [0, 1, -1, 0.8, -0.8, 1, -0.5, 0.7]
  return { x: Math.round(pattern[index % pattern.length] * amplitude) }
}

function getLabelSide(x: number, index: number): 'left' | 'right' {
  if (x > 0) return 'left'
  if (x < 0) return 'right'
  return index % 2 === 0 ? 'right' : 'left'
}

type CookbookNode = {
  recipe: Recipe
  recipeIndex: number
  photoUrl: string | undefined
  photoNumber: number
  totalPhotos: number
  isAddNode: boolean
}

export function LearningPath({
  recipes,
  isRecipeCompleted,
  onToggleCompletion,
  skillColor,
  skillIcon,
  skillName,
  mode = 'learn',
  userPhotos,
  onPhotoUpload,
  uploadingRecipeId,
  progression,
}: LearningPathProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerWidth = useContainerWidth(wrapperRef)
  const centerX = containerWidth / 2
  const colors = COLOR_MAP[skillColor] || COLOR_MAP.blue
  const completedCount = recipes.filter(r => isRecipeCompleted(r.id)).length
  const allCompleted = completedCount === recipes.length && recipes.length > 0
  const currentIndex = recipes.findIndex(r => !isRecipeCompleted(r.id))
  const isCookbook = mode === 'cookbook'

  // Gate prompt state
  const [gateOpen, setGateOpen] = useState(false)
  const [gatedRecipe, setGatedRecipe] = useState<Recipe | null>(null)

  const isRecipeGated = (recipeId: string): boolean => {
    if (!progression || progression.recipes.length === 0) return false
    const entry = progression.recipes.find(r => r.recipeId === recipeId)
    if (!entry) return false
    return !entry.isUnlocked
  }

  const handleGatedNodeClick = (recipe: Recipe) => {
    setGatedRecipe(recipe)
    setGateOpen(true)
  }

  // Build cookbook nodes
  const cookbookNodes: CookbookNode[] = []
  if (isCookbook) {
    for (let ri = 0; ri < recipes.length; ri++) {
      const recipe = recipes[ri]
      const photos = userPhotos?.get(recipe.id) || []
      const total = photos.length
      for (const photo of photos) {
        cookbookNodes.push({ recipe, recipeIndex: ri, photoUrl: photo.photoUrl, photoNumber: photo.photoNumber, totalPhotos: total, isAddNode: false })
      }
      if (total < 3) {
        cookbookNodes.push({ recipe, recipeIndex: ri, photoUrl: undefined, photoNumber: total + 1, totalPhotos: total, isAddNode: true })
      }
    }
  }

  const nodeCount = isCookbook ? cookbookNodes.length : recipes.length

  const chefMessages = [
    { afterIndex: 0, position: 'right' as const, message: "Nice work! You're on your way!" },
    { afterIndex: Math.floor(recipes.length / 2), position: 'left' as const, message: "Halfway there! Keep cooking!" },
  ]

  const CHEF_EXTRA = 100
  const START_Y = 100
  const spacing = isCookbook ? COOKBOOK_NODE_SPACING : NODE_SPACING
  const positions: { x: number; y: number }[] = []
  let cumulativeY = START_Y
  for (let i = 0; i < nodeCount; i++) {
    positions.push({ x: getNodePosition(i, containerWidth).x, y: cumulativeY })
    cumulativeY += spacing
    if (!isCookbook) {
      const hasChef = chefMessages.some(cm => cm.afterIndex === i && isRecipeCompleted(recipes[i].id))
      if (hasChef) cumulativeY += CHEF_EXTRA
    }
  }

  const trophyPos = { x: 0, y: cumulativeY }
  const allPoints = [...positions, trophyPos]
  const totalHeight = trophyPos.y + 350

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col items-center py-10 min-h-[70vh] rounded-3xl transition-colors duration-500 ${
        isCookbook ? 'bg-amber-50' : ''
      }`}
    >
      {/* Photo progress tracker */}
      {progression && progression.recipes.length > 0 && progression.photosNeededForNextUnlock > 0 && !isCookbook && (
        <div className="w-full max-w-lg mb-4 px-1">
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border bg-cq-surface border-cq-border`}>
            <Camera className={`size-4 flex-shrink-0 ${colors.accent}`} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-cq-text-secondary">
                  {progression.photosPosted} photo{progression.photosPosted !== 1 ? 's' : ''} posted
                </span>
                <span className="font-medium text-cq-text-primary">
                  {Math.max(0, progression.photosNeededForNextUnlock - progression.photosPosted)} more to unlock
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-cq-track">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${colors.node}`}
                  style={{
                    width: `${Math.min(100, (progression.photosPosted / progression.photosNeededForNextUnlock) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section banner */}
      <div className={`w-full max-w-lg rounded-2xl p-5 mb-16 shadow-2xl border ${
        isCookbook
          ? 'bg-gradient-to-r from-amber-400 to-orange-400 border-amber-300/50'
          : `bg-gradient-to-r ${colors.banner} border-white/10`
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/60">
              {skillName}
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {completedCount}/{recipes.length} Completed
            </div>
          </div>
          <div className="text-4xl">{skillIcon}</div>
        </div>
        <div className="mt-4 w-full bg-black/20 rounded-full h-3">
          <div
            className="bg-white rounded-full h-3 transition-all duration-700 ease-out"
            style={{ width: `${recipes.length > 0 ? (completedCount / recipes.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Path area */}
      <div className="relative mx-auto overflow-hidden" style={{ width: containerWidth, height: totalHeight }}>
        {/* SVG path */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={containerWidth}
          height={totalHeight}
          style={{ overflow: 'visible' }}
        >
          {allPoints.map((point, i) => {
            if (i >= allPoints.length - 1) return null
            const next = allPoints[i + 1]
            const isComp = isCookbook
              ? (i < cookbookNodes.length && isRecipeCompleted(cookbookNodes[i].recipe.id))
              : (i < recipes.length && isRecipeCompleted(recipes[i].id))
            const midY = (point.y + next.y) / 2
            return (
              <path
                key={i}
                d={`M ${centerX + point.x} ${point.y} C ${centerX + point.x} ${midY}, ${centerX + next.x} ${midY}, ${centerX + next.x} ${next.y}`}
                fill="none"
                stroke={isCookbook ? (isComp ? '#f59e0b' : '#d97706') : (isComp ? '#4ade80' : '#374151')}
                strokeWidth={4}
                strokeDasharray={isComp ? undefined : '8 8'}
                strokeLinecap="round"
              />
            )
          })}
        </svg>

        {/* Nodes */}
        {isCookbook ? (
          cookbookNodes.map((node, index) => {
            const pos = positions[index]
            if (!pos) return null
            const isCompleted = isRecipeCompleted(node.recipe.id)
            const isLocked = node.recipeIndex > 0 && !isRecipeCompleted(recipes[node.recipeIndex - 1].id) && !isCompleted
            const labelSide = getLabelSide(pos.x, index)
            const isCheckpoint = node.recipeIndex % 3 === 0 && node.photoNumber === 1

            return (
              <div
                key={`${node.recipe.id}-${node.photoNumber}`}
                className="absolute"
                style={{ left: centerX + pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              >
                <PhotoNode
                  recipeId={node.recipe.id}
                  photoUrl={node.photoUrl}
                  isLocked={isLocked}
                  isCheckpoint={isCheckpoint}
                  onUpload={onPhotoUpload || (() => {})}
                  isUploading={uploadingRecipeId === node.recipe.id}
                  labelSide={labelSide}
                  recipe={{ title: node.recipe.title, time: node.recipe.time }}
                  photoNumber={node.photoNumber}
                  totalPhotos={node.totalPhotos}
                />
              </div>
            )
          })
        ) : (
          recipes.map((recipe, index) => {
            const pos = positions[index]
            const isCompleted = isRecipeCompleted(recipe.id)
            const sequentialLock = index > 0 && !isRecipeCompleted(recipes[index - 1].id) && !isCompleted
            const gated = isRecipeGated(recipe.id)
            const isLocked = sequentialLock || gated
            const isCurrent = index === currentIndex && !gated
            const labelSide = getLabelSide(pos.x, index)

            return (
              <div
                key={recipe.id}
                className={`absolute ${gated && !sequentialLock ? 'opacity-50 grayscale' : ''}`}
                style={{ left: centerX + pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              >
                {gated ? (
                  <div onClick={() => handleGatedNodeClick(recipe)} className="cursor-pointer">
                    <PathNode
                      recipe={recipe} isCompleted={isCompleted} isLocked={isLocked}
                      isCurrent={false} index={index} colors={colors}
                      onToggle={() => {}} labelSide={labelSide}
                      gateMessage="Cook & post to unlock"
                    />
                  </div>
                ) : (
                  <PathNode
                    recipe={recipe} isCompleted={isCompleted} isLocked={isLocked}
                    isCurrent={isCurrent} index={index} colors={colors}
                    onToggle={onToggleCompletion} labelSide={labelSide}
                  />
                )}
              </div>
            )
          })
        )}

        {/* Chef messages */}
        {chefMessages.map((cm, i) => {
          if (cm.afterIndex >= recipes.length) return null
          if (!isRecipeCompleted(recipes[cm.afterIndex].id)) return null
          const pos = positions[cm.afterIndex]
          const nextPos = cm.afterIndex + 1 < positions.length ? positions[cm.afterIndex + 1] : trophyPos
          const midY = (pos.y + nextPos.y) / 2

          return (
            <div
              key={`chef-${i}`}
              className="absolute"
              style={{ left: centerX + (cm.position === 'right' ? 80 : -80), top: midY, transform: 'translate(-50%, -50%)' }}
            >
              <ChefCharacter position={cm.position} message={cm.message} cookbookMode={isCookbook} />
            </div>
          )
        })}

        {/* Trophy */}
        <div
          className="absolute"
          style={{ left: centerX, top: trophyPos.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="flex flex-col items-center">
            <div className={`
              w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500
              ${allCompleted
                ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-[0_0_40px_rgba(250,204,21,0.6),0_8px_0_0_rgb(161,98,7)] animate-bounce'
                : isCookbook ? 'bg-amber-100 shadow-[0_8px_0_0_rgb(217,119,6)]' : 'bg-gray-800 shadow-[0_8px_0_0_rgb(31,41,55)]'
              }
            `}>
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${allCompleted ? 'bg-yellow-300/30' : isCookbook ? 'bg-amber-50' : 'bg-gray-700'}`}>
                <Crown className={`size-12 ${allCompleted ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : isCookbook ? 'text-amber-400' : 'text-cq-text-muted'}`} />
              </div>
            </div>

            <div className="mt-5 text-center">
              {allCompleted ? (
                <div className="space-y-2">
                  <div className="flex gap-2 justify-center">
                    <Star className="size-6 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                    <Star className="size-7 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
                    <Star className="size-6 fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]" />
                  </div>
                  <p className="text-xl font-black text-yellow-400">SKILL MASTERED!</p>
                  <p className={`text-sm ${isCookbook ? 'text-stone-500' : 'text-cq-text-secondary'}`}>All {recipes.length} recipes completed</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${isCookbook ? 'text-stone-500' : 'text-cq-text-secondary'}`}>COMPLETE ALL RECIPES</p>
                  <p className={`text-xs ${isCookbook ? 'text-stone-400' : 'text-cq-text-muted'}`}>to master this skill</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* End chef */}
        <div
          className="absolute"
          style={{ left: centerX, top: trophyPos.y + 220, transform: 'translate(-50%, 0)' }}
        >
          <ChefCharacter
            position="left"
            message={allCompleted ? "You're a true chef now!" : "I believe in you! Keep going!"}
            size="lg"
            cookbookMode={isCookbook}
          />
        </div>
      </div>

      {/* Gate prompt */}
      {gatedRecipe && (
        <GatePrompt
          open={gateOpen}
          onOpenChange={setGateOpen}
          recipeName={gatedRecipe.title}
          recipeEmoji={gatedRecipe.emoji}
          photosPosted={progression?.photosPosted ?? 0}
          photosNeededForNextUnlock={progression?.photosNeededForNextUnlock ?? 1}
          skillColor={skillColor}
        />
      )}
    </div>
  )
}
