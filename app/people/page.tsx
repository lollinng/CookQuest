'use client';

import { useState, useEffect } from 'react';
import { Search, Trophy } from 'lucide-react';
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
import type { LeaderboardEntry } from '@/lib/types';

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankDisplay =
    entry.rank === 1 ? '🥇' :
    entry.rank === 2 ? '🥈' :
    entry.rank === 3 ? '🥉' : null;

  return (
    <Link
      href={`/profile/${entry.id}`}
      className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-white/5 transition-colors"
    >
      <div className="w-8 text-center font-bold text-lg">
        {rankDisplay ?? <span className="text-cq-text-muted text-sm">{entry.rank}</span>}
      </div>
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.displayName || entry.username}
          className="size-10 rounded-full object-cover border border-cq-border shrink-0"
        />
      ) : (
        <div className="size-10 rounded-full bg-cq-primary flex items-center justify-center text-white text-sm font-bold border border-cq-border shrink-0">
          {(entry.displayName || entry.username).charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cq-text-primary truncate">
          {entry.displayName || entry.username}
        </p>
        <p className="text-xs text-cq-text-muted">@{entry.username}</p>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold text-cq-primary">{entry.recipesCompleted}</div>
        <div className="text-[10px] text-cq-text-muted">recipes</div>
      </div>
    </Link>
  );
}

function LeaderboardSection() {
  const [tab, setTab] = useState<'world' | 'friends'>('world');
  const worldQuery = useWorldLeaderboard(10);
  const friendsQuery = useFriendsLeaderboard(10);

  const { data: entries, isLoading } = tab === 'world' ? worldQuery : friendsQuery;

  return (
    <div className="bg-cq-surface border border-cq-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-cq-text-primary flex items-center gap-2">
          <Trophy className="size-4 text-amber-400" />
          Leaderboard
        </h2>
        <div className="flex items-center bg-cq-bg border border-cq-border rounded-full p-0.5">
          <button
            onClick={() => setTab('world')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tab === 'world' ? 'bg-cq-primary text-white' : 'text-cq-text-secondary hover:text-cq-text-primary'
            }`}
          >
            World
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tab === 'friends' ? 'bg-cq-primary text-white' : 'text-cq-text-secondary hover:text-cq-text-primary'
            }`}
          >
            Friends
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="w-8 h-6 rounded" />
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-8" />
            </div>
          ))}
        </div>
      ) : entries && entries.length > 0 ? (
        <div className="divide-y divide-cq-border/50">
          {entries.map((entry) => (
            <LeaderboardRow key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-cq-text-muted py-8 text-center">
          {tab === 'friends'
            ? 'Follow people to see how you compare!'
            : 'No users yet.'}
        </p>
      )}
    </div>
  );
}

export default function PeoplePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { user } = useAuth();
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
