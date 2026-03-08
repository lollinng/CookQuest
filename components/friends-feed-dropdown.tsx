'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Users, MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFeed } from '@/hooks/use-social';
import { getAvatarColor, getInitials, formatRelativeTime, getActionText } from '@/lib/social-helpers';
import type { UserPost } from '@/lib/types';

function getThumbnailUrl(post: UserPost): string | null {
  if (post.postType === 'photo_upload' && post.photoUrl) return post.photoUrl;
  if (post.recipeImageUrl) return post.recipeImageUrl;
  return null;
}

// ── Component ──

export function FriendsFeedDropdown() {
  const { data: posts, isLoading } = useFeed();
  const recentPosts = (posts ?? []).slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          data-testid="friends-feed-trigger"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-cq-text-primary hover:bg-cq-surface-hover transition-colors"
        >
          <Users className="size-4" />
          <span className="hidden sm:inline">Friends</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 bg-cq-surface border border-cq-border rounded-xl shadow-xl"
      >
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-cq-border">
          <h3 className="text-sm font-semibold text-cq-text-primary">
            Friends Activity
          </h3>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-cq-text-secondary">
              Loading...
            </div>
          ) : recentPosts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-cq-text-secondary">
                Follow people to see their cooking activity!
              </p>
              <Link
                href="/people"
                className="inline-block mt-2 text-sm font-medium text-cq-primary hover:underline"
              >
                Find people to follow
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-cq-border">
              {recentPosts.map((post) => (
                <FeedItem key={post.id} post={post} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-cq-border">
          <Link
            href="/people"
            className="text-xs font-medium text-cq-primary hover:underline"
          >
            Find people to follow
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Feed Item ──

function FeedItem({ post }: { post: UserPost }) {
  const displayName = post.displayName ?? post.username;
  const thumbnailUrl = getThumbnailUrl(post);

  return (
    <li className="px-4 py-3 hover:bg-cq-surface-hover transition-colors">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={`size-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${getAvatarColor(post.username)}`}
        >
          {getInitials(displayName)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-cq-text-primary leading-snug">
            <span className="font-semibold">{post.username}</span>{' '}
            <span className="text-cq-text-secondary">{getActionText(post)}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-cq-text-secondary">
              {formatRelativeTime(post.createdAt)}
            </span>
            {post.commentsCount > 0 && (
              <Link
                href={`/people/${post.userId}`}
                className="flex items-center gap-0.5 text-xs text-cq-text-secondary hover:text-cq-primary transition-colors"
              >
                <MessageCircle className="size-3" />
                <span>{post.commentsCount}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="size-10 rounded-md overflow-hidden shrink-0 bg-cq-surface-hover">
            <Image
              src={thumbnailUrl}
              alt={post.recipeTitle ?? 'Post image'}
              width={40}
              height={40}
              className="size-10 object-cover"
            />
          </div>
        )}
      </div>
    </li>
  );
}
