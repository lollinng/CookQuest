'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { UserCard } from '@/components/user-card';
import { useSearchUsers, useFollowUser, useUnfollowUser } from '@/hooks/use-social';
import { useAuth } from '@/lib/auth-context';

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
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Title */}
      <h1 className="text-2xl font-bold text-cq-text-primary mb-6">Find People</h1>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cq-text-secondary" />
        <input
          type="text"
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-cq-surface border border-cq-border rounded-lg pl-10 pr-4 py-2 text-sm text-cq-text-primary placeholder:text-cq-text-secondary focus:outline-none focus:ring-2 focus:ring-cq-primary/50 focus:border-cq-primary transition-colors"
        />
      </div>

      {/* Default state */}
      {showDefault && (
        <p className="text-center text-cq-text-secondary py-12">
          Search for users by username
        </p>
      )}

      {/* Loading state */}
      {showLoading && (
        <div className="flex justify-center py-12">
          <div className="size-6 border-2 border-cq-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {showEmpty && (
        <p className="text-center text-cq-text-secondary py-12">
          No users found matching &apos;{debouncedQuery}&apos;
        </p>
      )}

      {/* Results */}
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
    </div>
  );
}
