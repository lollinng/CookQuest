'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ArrowRight, Lock } from 'lucide-react'
import type { SkillProgress } from '@/lib/types'
import Link from 'next/link'

interface Skill {
  id: string
  name: string
  description: string
  icon: string
  recipes: string[]
  color: string
}

interface SkillCardProps {
  skill: Skill
  progress: SkillProgress
  isLocked?: boolean
}

export function SkillCard({ skill, progress, isLocked = false }: SkillCardProps) {
  const isCompleted = progress.percentage === 100
  const progressIndicatorColor: Record<string, string> = {
    blue: 'bg-gradient-to-r from-blue-400 to-blue-600',
    orange: 'bg-gradient-to-r from-orange-400 to-orange-600',
    purple: 'bg-gradient-to-r from-purple-400 to-purple-600',
    emerald: 'bg-gradient-to-r from-emerald-400 to-emerald-600',
    amber: 'bg-gradient-to-r from-amber-400 to-amber-600',
  }
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 border-blue-200',
    orange: 'from-orange-500 to-orange-600 border-orange-200',
    purple: 'from-purple-500 to-purple-600 border-purple-200',
    emerald: 'from-emerald-500 to-emerald-600 border-emerald-200',
    amber: 'from-amber-500 to-amber-600 border-amber-200',
  }

  const bgColorClasses = {
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50',
  }

  const card = (
    <Card className={`
      relative overflow-hidden transition-all duration-200
      ${isLocked
        ? 'opacity-60 cursor-not-allowed grayscale-[30%]'
        : 'hover:shadow-lg cursor-pointer hover:scale-[1.02]'
      }
      ${isCompleted ? 'ring-2 ring-green-400' : ''}
      ${bgColorClasses[skill.color as keyof typeof bgColorClasses] || 'bg-gray-50'}
    `}>
      {/* Background gradient */}
      <div className={`
        absolute top-0 left-0 w-full h-2 bg-gradient-to-r
        ${isLocked ? 'from-gray-400 to-gray-500' : colorClasses[skill.color as keyof typeof colorClasses] || 'from-gray-500 to-gray-600'}
      `} />

      <CardHeader className="pb-3 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              w-12 h-12 rounded-xl bg-gradient-to-r flex items-center justify-center text-white text-xl
              ${isLocked ? 'from-gray-400 to-gray-500' : colorClasses[skill.color as keyof typeof colorClasses] || 'from-gray-500 to-gray-600'}
            `}>
              {isLocked ? <Lock className="size-5" /> : skill.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{skill.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{skill.description}</p>
            </div>
          </div>
          {isLocked && (
            <Badge variant="secondary" className="bg-gray-200 text-gray-600 border-gray-300">
              <Lock className="size-3 mr-1" />
              Locked
            </Badge>
          )}
          {isCompleted && !isLocked && (
            <CheckCircle className="text-green-500 size-6" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLocked ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progress</span>
                <span className="font-medium text-gray-500">
                  0/{progress.total} completed
                </span>
              </div>
              <Progress value={0} className="h-2" indicatorClassName={progressIndicatorColor[skill.color]} />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
              <Lock className="size-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">
                Complete Basic Cooking to unlock this skill
              </span>
            </div>
            <div className="text-xs text-gray-500 pt-2 border-t">
              {skill.recipes.length} recipes available after unlock
            </div>
          </>
        ) : (
          <>
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">
                  {progress.completed}/{progress.total} completed
                </span>
              </div>
              <Progress value={progress.percentage} className="h-2" indicatorClassName={progressIndicatorColor[skill.color]} />
              <div className="text-xs text-gray-500">
                {progress.percentage}% complete
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              {isCompleted ? (
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  Mastered
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {progress.completed > 0 ? 'In Progress' : 'Start Learning'}
                </Badge>
              )}

              <div className="flex items-center gap-1 text-sm text-gray-500">
                View recipes <ArrowRight className="size-3" />
              </div>
            </div>

            {/* Quick stats */}
            <div className="text-xs text-gray-500 pt-2 border-t">
              {skill.recipes.length} recipes available
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  if (isLocked) {
    return <div className="block">{card}</div>
  }

  return (
    <Link href={`/skill/${skill.id}`} className="block">
      {card}
    </Link>
  )
}
