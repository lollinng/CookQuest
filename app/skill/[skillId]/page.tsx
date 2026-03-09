'use client'

import { useParams } from 'next/navigation'
import { ArrowLeft, Flame, Zap, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LearningPath } from '@/components/learning-path'
import { useRecipeStore, useStoreHydrated } from '@/lib/stores/recipe-store'
import { useSkillData, useSkills, useUserPhotos, useUploadRecipePhoto } from '@/hooks/use-recipes'
import { Skeleton } from '@/components/ui/skeleton'
import type { SkillType } from '@/lib/types'
import Link from 'next/link'
import { SectionErrorBoundary } from '@/components/section-error-boundary'
import { useState, useEffect, useRef } from 'react'
import { usePWAInstall } from '@/hooks/use-pwa-install'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

const SKILL_META: Record<string, {
  gradient: string
  icon: string
  color: string
  learn: string[]
}> = {
  'basic-cooking': {
    gradient: 'from-blue-500 to-blue-600',
    icon: '👨‍🍳',
    color: 'blue',
    learn: ['Knife techniques', 'Cooking methods', 'Food safety', 'Kitchen organization'],
  },
  'heat-control': {
    gradient: 'from-orange-500 to-red-500',
    icon: '🔥',
    color: 'orange',
    learn: ['High-heat searing', 'Simmering', 'Deep frying', 'Stir frying', 'Grilling'],
  },
  'flavor-building': {
    gradient: 'from-purple-500 to-purple-600',
    icon: '🌟',
    color: 'purple',
    learn: ['Seasoning', 'Herb pairings', 'Spice blends', 'Marinating', 'Taste balancing'],
  },
  'air-fryer': {
    gradient: 'from-emerald-500 to-emerald-600',
    icon: '🍟',
    color: 'emerald',
    learn: ['Temperature settings', 'Basket arrangement', 'Oil spraying', 'Timing techniques', 'Preheating'],
  },
  'indian-cuisine': {
    gradient: 'from-amber-500 to-amber-600',
    icon: '🍛',
    color: 'amber',
    learn: ['Tempering (Tadka)', 'Spice blending', 'Curry bases', 'Flatbread making', 'Rice techniques', 'Yogurt-based dishes'],
  },
}

const SLUG_TO_SKILL: Record<string, SkillType> = {
  'basiccooking': 'basic-cooking',
  'basic-cooking': 'basic-cooking',
  'heatcontrol': 'heat-control',
  'heat-control': 'heat-control',
  'flavorbuilding': 'flavor-building',
  'flavor-building': 'flavor-building',
  'airfryer': 'air-fryer',
  'air-fryer': 'air-fryer',
  'indiancuisine': 'indian-cuisine',
  'indian-cuisine': 'indian-cuisine',
}

const VIEW_KEY = 'cookquest_skill_view'

export default function SkillPage() {
  const params = useParams()
  const rawSlug = params.skillId as string
  const skillId = SLUG_TO_SKILL[rawSlug] || rawSlug

  const [mode, setMode] = useState<'learn' | 'cookbook'>('learn')
  const [uploadingRecipeId, setUploadingRecipeId] = useState<string | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const hasPrompted = useRef(false)
  const { shouldShow: shouldShowInstall } = usePWAInstall()

  // Persist toggle state in localStorage
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY)
    if (saved === 'cookbook' || saved === 'learn') setMode(saved)
  }, [])

  const handleSetMode = (m: 'learn' | 'cookbook') => {
    setMode(m)
    localStorage.setItem(VIEW_KEY, m)
  }

  const hydrated = useStoreHydrated()
  const { getSkillProgress, toggleRecipeCompletion, isRecipeCompleted } = useRecipeStore()
  const { data: skills } = useSkills()
  const { data: recipes, isLoading, isError } = useSkillData(skillId)
  const { data: userPhotos } = useUserPhotos()
  const uploadPhoto = useUploadRecipePhoto()

  const triggerInstallPrompt = () => {
    if (shouldShowInstall && !hasPrompted.current) {
      setShowInstallPrompt(true)
      hasPrompted.current = true
    }
  }

  const handlePhotoUpload = async (recipeId: string, file: File) => {
    setUploadingRecipeId(recipeId)
    try {
      await uploadPhoto.mutateAsync({ recipeId, file })
      triggerInstallPrompt()
    } finally {
      setUploadingRecipeId(null)
    }
  }

  const handleToggleCompletion = (recipeId: string) => {
    const wasCompleted = isRecipeCompleted(recipeId)
    toggleRecipeCompletion(recipeId)
    // Trigger install prompt when marking as complete (not uncomplete)
    if (!wasCompleted) {
      triggerInstallPrompt()
    }
  }

  const skill = skills?.find(s => s.id === skillId)
  const meta = SKILL_META[skillId]
  const progress = hydrated ? getSkillProgress(skillId as SkillType) : { completed: 0, total: 0, percentage: 0 }

  if (isError || (!isLoading && !skill && !meta)) {
    return (
      <div className="min-h-screen bg-cq-bg flex flex-col items-center justify-center space-y-4">
        <div className="text-red-400 text-lg font-medium">Skill not found</div>
        <Link href="/">
          <Button variant="outline" className="border-cq-border text-cq-text-secondary">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const name = skill?.name || skillId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const description = skill?.description || ''
  const icon = meta?.icon || skill?.icon || '📚'
  const color = meta?.color || skill?.color || 'blue'
  const recipeCount = skill?.recipes?.length || recipes?.length || 0

  return (
    <div
      className={`pb-16 transition-colors duration-500 ${mode === 'cookbook' ? 'bg-amber-50' : 'bg-cq-bg'}`}
      style={{ minHeight: '100vh', width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginTop: '-24px', marginBottom: '-24px' }}
    >
      {/* Sticky top bar */}
      <div className={`sticky top-0 z-20 backdrop-blur-md border-b py-3 transition-colors duration-500 ${
        mode === 'cookbook'
          ? 'bg-amber-50/90 border-amber-200'
          : 'bg-cq-bg/90 border-cq-border'
      }`}>
        <div className="max-w-2xl mx-auto px-4">
          <div className="grid grid-cols-3 items-center">
            {/* Left: back button */}
            <div>
              <Link href="/">
                <Button variant="ghost" size="sm" className={mode === 'cookbook' ? 'text-stone-500 hover:text-stone-800 hover:bg-amber-100' : 'text-cq-text-muted hover:text-cq-text-primary hover:bg-cq-surface'}>
                  <ArrowLeft className="size-5" />
                </Button>
              </Link>
            </div>

            {/* Center: progress bar */}
            <div className="flex justify-center">
              <div className={`w-full max-w-[180px] rounded-full h-3 ${mode === 'cookbook' ? 'bg-amber-200' : 'bg-cq-track'}`}>
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-400 rounded-full h-3 transition-all duration-700"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Right: stats */}
            <div className="flex items-center gap-3 justify-end">
              <div className="flex items-center gap-1.5">
                <Flame className="size-5 text-orange-500" />
                <span className={`font-bold text-sm ${mode === 'cookbook' ? 'text-orange-600' : 'text-orange-400'}`}>{progress.completed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="size-5 text-yellow-500" />
                <span className={`font-bold text-sm ${mode === 'cookbook' ? 'text-yellow-600' : 'text-yellow-400'}`}>{progress.completed * 100}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Trophy className="size-5 text-purple-500" />
                <span className={`font-bold text-sm ${mode === 'cookbook' ? 'text-purple-600' : 'text-purple-400'}`}>
                  {progress.percentage === 100 ? '1' : '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle chip — second row, centered */}
          <div className="flex justify-center mt-3">
            <div className={`inline-flex rounded-full p-1 text-sm font-bold shadow-lg ${
              mode === 'cookbook'
                ? 'bg-amber-200 shadow-amber-200/30'
                : 'bg-cq-surface shadow-black/30'
            }`}>
              <button
                onClick={() => handleSetMode('learn')}
                className={`px-5 py-2 rounded-full transition-all duration-200 ${
                  mode === 'learn'
                    ? 'bg-blue-500 text-white shadow-md'
                    : mode === 'cookbook'
                      ? 'text-amber-700 hover:bg-amber-300/50'
                      : 'text-cq-text-secondary hover:bg-cq-surface-hover'
                }`}
              >
                📚 Learn
              </button>
              <button
                onClick={() => handleSetMode('cookbook')}
                className={`px-5 py-2 rounded-full transition-all duration-200 ${
                  mode === 'cookbook'
                    ? 'bg-amber-500 text-white shadow-md'
                    : mode === 'learn'
                      ? 'text-cq-text-secondary hover:bg-cq-surface-hover'
                      : 'text-amber-700 hover:bg-amber-300/50'
                }`}
              >
                📸 Cookbook
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Skill header */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-3">{icon}</div>
          <h1 className={`text-3xl font-black tracking-tight ${mode === 'cookbook' ? 'text-stone-800' : 'text-cq-text-primary'}`}>{name}</h1>
          <p className={`mt-2 text-sm ${mode === 'cookbook' ? 'text-stone-500' : 'text-cq-text-muted'}`}>{description}</p>
        </div>

        {/* Skill tags */}
        {meta && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {meta.learn.map((item, i) => (
              <span key={i} className={`text-xs px-3 py-1.5 rounded-full border ${
                mode === 'cookbook'
                  ? 'bg-amber-100 text-stone-600 border-amber-300'
                  : 'bg-cq-surface text-cq-text-secondary border-cq-border'
              }`}>
                {item}
              </span>
            ))}
          </div>
        )}

        {/* Learning path */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-12 py-12">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-full bg-cq-surface" />
            ))}
          </div>
        ) : recipes && recipes.length > 0 ? (
          <SectionErrorBoundary section="learning-path">
            <LearningPath
              recipes={recipes}
              isRecipeCompleted={hydrated ? isRecipeCompleted : () => false}
              onToggleCompletion={handleToggleCompletion}
              skillColor={color}
              skillIcon={icon}
              skillName={name}
              mode={mode}
              userPhotos={userPhotos}
              onPhotoUpload={handlePhotoUpload}
              uploadingRecipeId={uploadingRecipeId}
            />
          </SectionErrorBoundary>
        ) : (
          <div className={`text-center py-16 ${mode === 'cookbook' ? 'text-stone-400' : 'text-cq-text-muted'}`}>
            No recipes found for this skill.
          </div>
        )}
      </div>

      <PWAInstallPrompt
        isOpen={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
      />
    </div>
  )
}
