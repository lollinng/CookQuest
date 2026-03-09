'use client'

import { useState } from 'react'
import { Trophy, Medal, Crown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorldLeaderboard, useFriendsLeaderboard } from '@/hooks/use-social'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import type { LeaderboardEntry } from '@/lib/types'

type LeaderboardTab = 'world' | 'friends'

const RANK_STYLES: Record<number, { icon: React.ReactNode; bg: string }> = {
  1: { icon: <Crown className="size-5 text-yellow-400 fill-yellow-400" />, bg: 'bg-yellow-500/10 border-yellow-500/30' },
  2: { icon: <Medal className="size-5 text-gray-300" />, bg: 'bg-gray-400/10 border-gray-400/30' },
  3: { icon: <Medal className="size-5 text-amber-600" />, bg: 'bg-amber-600/10 border-amber-600/30' },
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const style = RANK_STYLES[entry.rank]
  const displayName = entry.displayName ?? entry.username

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      style?.bg || 'bg-cq-surface border-cq-border'
    }`}>
      {/* Rank */}
      <div className="w-8 flex items-center justify-center">
        {style?.icon || (
          <span className="text-sm font-bold text-cq-text-muted">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      {entry.avatarUrl ? (
        <Link href={`/profile/${entry.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.avatarUrl}
            alt={displayName}
            className="size-10 rounded-full object-cover"
          />
        </Link>
      ) : (
        <Link href={`/profile/${entry.id}`}>
          <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(entry.username)}`}>
            {displayName.charAt(0).toUpperCase()}
          </div>
        </Link>
      )}

      {/* Name + username */}
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${entry.id}`} className="text-sm font-semibold text-cq-text-primary hover:underline truncate block">
          {displayName}
        </Link>
        <p className="text-xs text-cq-text-muted">@{entry.username}</p>
      </div>

      {/* Dish count */}
      <div className="text-right">
        <span className="text-lg font-black text-cq-text-primary">{entry.recipesCompleted}</span>
        <p className="text-xs text-cq-text-muted">dishes</p>
      </div>
    </div>
  )
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<LeaderboardTab>('world')
  const { isAuthenticated } = useAuth()

  const { data: worldData, isLoading: worldLoading } = useWorldLeaderboard(20)
  const { data: friendsData, isLoading: friendsLoading } = useFriendsLeaderboard(20)

  const data = tab === 'world' ? worldData : friendsData
  const isLoading = tab === 'world' ? worldLoading : friendsLoading

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-cq-text-muted hover:text-cq-text-primary">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="size-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-cq-text-primary">Leaderboard</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-cq-surface border border-cq-border rounded-full p-1">
        <button
          onClick={() => setTab('world')}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'world'
              ? 'bg-cq-primary text-white'
              : 'text-cq-text-secondary hover:text-cq-text-primary'
          }`}
        >
          This Week
        </button>
        {isAuthenticated && (
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === 'friends'
                ? 'bg-cq-primary text-white'
                : 'text-cq-text-secondary hover:text-cq-text-primary'
            }`}
          >
            Friends
          </button>
        )}
      </div>

      {/* Leaderboard list */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cq-surface border border-cq-border">
              <Skeleton className="w-8 h-5" />
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="bg-cq-surface border border-cq-border rounded-xl p-8 text-center">
          <Trophy className="size-12 mx-auto text-cq-text-muted mb-3" />
          <p className="text-cq-text-secondary">
            {tab === 'friends'
              ? 'Follow people to see their rankings!'
              : 'No cooks this week yet. Be the first!'}
          </p>
        </div>
      )}
    </div>
  )
}
