'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { CommentSection } from '@/components/post-comments';
import { getAvatarColor, getInitials, formatRelativeTime, getActionText } from '@/lib/social-helpers';
import type { UserPost } from '@/lib/types';

export function FeedPostCard({ post }: { post: UserPost }) {
  const displayName = post.displayName ?? post.username;

  return (
    <div data-testid="feed-post-card" className="bg-cq-surface border border-cq-border rounded-xl overflow-hidden">
      {/* Header: avatar + username + time */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${post.userId}`}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(post.username)}`}
          >
            {getInitials(displayName)}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${post.userId}`}
            className="text-sm font-semibold text-cq-text-primary hover:underline"
          >
            {post.username}
          </Link>
          <p className="text-xs text-muted-foreground">{getActionText(post)}</p>
        </div>
        <span className="text-xs text-muted-foreground">{formatRelativeTime(post.createdAt)}</span>
      </div>

      {/* Content: image or milestone */}
      {post.postType === 'milestone' ? (
        <div className="px-4 py-8 bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex flex-col items-center gap-2">
          <Trophy className="size-10 text-amber-400" />
          <p className="text-lg font-semibold text-cq-text-primary text-center">
            {post.caption || 'Reached a milestone!'}
          </p>
        </div>
      ) : (
        <>
          {(post.photoUrl || post.recipeImageUrl) && (
            <img
              src={post.photoUrl || post.recipeImageUrl!}
              alt={post.recipeTitle || 'Post image'}
              className="w-full aspect-[4/3] object-cover"
              loading="lazy"
            />
          )}
        </>
      )}

      {/* Caption + recipe title */}
      <div className="px-4 py-3 space-y-1">
        {post.recipeTitle && post.postType !== 'milestone' && (
          <p className="text-sm font-medium text-cq-text-primary">
            {post.postType === 'recipe_completed' ? 'Completed: ' : ''}
            {post.recipeTitle}
          </p>
        )}
        {post.caption && post.postType !== 'milestone' && (
          <p className="text-sm text-cq-text-secondary">{post.caption}</p>
        )}
      </div>

      {/* Comments */}
      <div className="px-4 pb-3">
        <CommentSection postId={post.id} commentsCount={post.commentsCount || 0} />
      </div>
    </div>
  );
}
