'use client';

import { useState, useEffect } from 'react';
import { Search, Trophy, Crown, Medal } from 'lucide-react';
import Link from 'next/link';
import { UserCard } from '@/components/user-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useSearchUsers,
  useFollowUser,
  useUnfollowUser,
  useWorldLeaderboard,
  useFriendsLeaderboard,
} from '@/hooks/use-social';
import { useAuth } from '@/lib/auth-context';
import { DemoModeBanner } from '@/components/onboarding/demo-mode-banner';
import { useDemoPeople } from '@/hooks/use-onboarding';
import type { LeaderboardEntry } from '@/lib/types';

const RANK_STYLES: Record<number, { icon: React.ReactNode; bg: string }> = {
  1: { icon: <Crown className="size-5 text-yellow-400 fill-yellow-400" />, bg: 'bg-yellow-500/10 border-yellow-500/30' },
  2: { icon: <Medal className="size-5 text-gray-300" />, bg: 'bg-gray-400/10 border-gray-400/30' },
  3: { icon: <Medal className="size-5 text-amber-600" />, bg: 'bg-amber-600/10 border-amber-600/30' },
};

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-red-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const style = RANK_STYLES[entry.rank];
  const displayName = entry.displayName ?? entry.username;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      style?.bg || 'bg-cq-surface border-cq-border'
    }`}>
      <div className="w-8 flex items-center justify-center">
        {style?.icon || (
          <span className="text-sm font-bold text-cq-text-muted">#{entry.rank}</span>
        )}
      </div>
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
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${entry.id}`} className="text-sm font-semibold text-cq-text-primary hover:underline truncate block">
          {displayName}
        </Link>
        <p className="text-xs text-cq-text-muted">@{entry.username}</p>
      </div>
      <div className="text-right">
        <span className="text-lg font-black text-cq-text-primary">{entry.recipesCompleted}</span>
        <p className="text-xs text-cq-text-muted">dishes</p>
      </div>
    </div>
  );
}

function LeaderboardSection() {
  const [tab, setTab] = useState<'world' | 'friends'>('world');
  const { isAuthenticated } = useAuth();
  const worldQuery = useWorldLeaderboard(20);
  const friendsQuery = useFriendsLeaderboard(20);

  const { data: entries, isLoading } = tab === 'world' ? worldQuery : friendsQuery;

  return (
    <div className="bg-cq-surface border border-cq-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-5 text-amber-500" />
        <h2 className="text-lg font-bold text-cq-text-primary">Leaderboard</h2>
      </div>

      <div className="flex items-center bg-cq-bg border border-cq-border rounded-full p-1 mb-4">
        <button
          onClick={() => setTab('world')}
          className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
            tab === 'world' ? 'bg-cq-primary text-white' : 'text-cq-text-secondary hover:text-cq-text-primary'
          }`}
        >
          This Week
        </button>
        {isAuthenticated && (
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === 'friends' ? 'bg-cq-primary text-white' : 'text-cq-text-secondary hover:text-cq-text-primary'
            }`}
          >
            Friends
          </button>
        )}
      </div>

      {isLoading ? (
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
      ) : entries && entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-cq-text-muted py-8 text-center">
          {tab === 'friends'
            ? 'Follow people to see how you compare!'
            : 'No cooks this week yet. Be the first!'}
        </p>
      )}
    </div>
  );
}

function DemoPeopleSection() {
  const { data: demoPeople } = useDemoPeople();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-cq-text-primary">Find People</h1>
      <DemoModeBanner
        title="Find and follow home cooks!"
        subtitle="Join to discover people, see their progress, and cook together."
      />
      {demoPeople && (
        <div className="flex flex-col gap-3">
          {demoPeople.map((person, i) => (
            <div key={i} className="bg-cq-surface border border-cq-border rounded-xl p-4 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={person.avatarUrl} alt={person.username} className="size-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cq-text-primary truncate">{person.displayName}</p>
                <p className="text-xs text-cq-text-secondary">@{person.username} &middot; {person.recipesCompleted} recipes &middot; {person.streakDays}d streak</p>
              </div>
              <Link href="/onboarding">
                <button className="bg-cq-primary text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity">
                  Sign up to follow
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PeoplePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { user, isAuthenticated } = useAuth();
  const { data: results, isLoading } = useSearchUsers(debouncedQuery);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleFollow = (userId: number) => {
    followMutation.mutate(userId);
  };

  const handleUnfollow = (userId: number) => {
    unfollowMutation.mutate(userId);
  };

  const showDefault = debouncedQuery.length < 2;
  const showLoading = !showDefault && isLoading;
  const showEmpty = !showDefault && !isLoading && results && results.length === 0;
  const showResults = !showDefault && !isLoading && results && results.length > 0;

  if (!isAuthenticated) {
    return <DemoPeopleSection />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Title */}
      <h1 className="text-2xl font-bold text-cq-text-primary">Find People</h1>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cq-text-secondary" />
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-cq-surface border border-cq-border rounded-lg pl-10 pr-4 py-2 text-sm text-cq-text-primary placeholder:text-cq-text-secondary focus:outline-none focus:ring-2 focus:ring-cq-primary/50 focus:border-cq-primary transition-colors"
        />
      </div>

      {/* Search results */}
      {showLoading && (
        <div className="flex justify-center py-12">
          <div className="size-6 border-2 border-cq-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {showEmpty && (
        <p className="text-center text-cq-text-secondary py-12">
          No users found matching &apos;{debouncedQuery}&apos;
        </p>
      )}

      {showResults && (
        <div className="flex flex-col gap-3">
          {results.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              isOwnProfile={user?.id === u.id}
            />
          ))}
        </div>
      )}

      {/* Leaderboard — always visible */}
      <LeaderboardSection />
    </div>
  );
}
