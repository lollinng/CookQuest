'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FollowUser } from '@/lib/types';

interface UserCardProps {
  user: FollowUser;
  onFollow?: (userId: number) => void;
  onUnfollow?: (userId: number) => void;
  isOwnProfile?: boolean;
}

function getInitials(user: FollowUser): string {
  const name = user.displayName || user.username;
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-orange-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-rose-500',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function UserCard({ user, onFollow, onUnfollow, isOwnProfile }: UserCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  const handleFollowClick = () => {
    if (user.isFollowing) {
      onUnfollow?.(user.id);
    } else {
      onFollow?.(user.id);
    }
  };

  return (
    <div className="bg-cq-surface border border-cq-border rounded-xl p-4 flex items-center gap-3">
      {/* Avatar */}
      <Link href={`/profile/${user.id}`}>
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div
            className={`size-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(user.username)}`}
          >
            {getInitials(user)}
          </div>
        )}
      </Link>

      {/* Name + Username */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/profile/${user.id}`}
          className="block text-sm font-semibold text-cq-text-primary hover:underline truncate"
        >
          {user.displayName || user.username}
        </Link>
        {user.displayName && (
          <span className="block text-xs text-cq-text-secondary truncate">
            @{user.username}
          </span>
        )}
      </div>

      {/* Follow / Unfollow button */}
      {!isOwnProfile && (
        <button
          onClick={handleFollowClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={
            user.isFollowing
              ? `border border-cq-border rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                  isHovering
                    ? 'border-red-500 text-red-500'
                    : 'text-cq-text-primary'
                }`
              : 'bg-cq-primary text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity'
          }
        >
          {user.isFollowing
            ? isHovering
              ? 'Unfollow'
              : 'Following'
            : 'Follow'}
        </button>
      )}
    </div>
  );
}
