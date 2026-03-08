'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { usePostComments, useAddComment, useDeleteComment } from '@/hooks/use-social';
import type { PostComment } from '@/lib/types';

// ── Helpers ──

const AVATAR_COLORS = [
  'bg-orange-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-indigo-500',
];

function getAvatarColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffSeconds = Math.floor((now - date) / 1000);

  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

// ── Comment Item ──

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  isDeleting,
}: {
  comment: PostComment;
  currentUserId: number | undefined;
  onDelete: (commentId: number) => void;
  isDeleting: boolean;
}) {
  const displayName = comment.displayName ?? comment.username;
  const isOwn = currentUserId === comment.userId;

  return (
    <div className="flex gap-2 p-2 rounded-lg bg-muted/50 group">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getAvatarColor(comment.username)}`}
      >
        {getInitials(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-cq-text-primary">{comment.username}</span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-cq-text-primary mt-0.5 break-words">{comment.content}</p>
      </div>
      {isOwn && (
        <button
          onClick={() => onDelete(comment.id)}
          disabled={isDeleting}
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
          aria-label="Delete comment"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Main Component ──

export function CommentSection({
  postId,
  commentsCount,
}: {
  postId: number;
  commentsCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const { user } = useAuth();
  const listEndRef = useRef<HTMLDivElement>(null);

  const { data: comments, isLoading } = usePostComments(isOpen ? postId : 0);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const displayCount = comments?.length ?? commentsCount;

  useEffect(() => {
    if (comments && listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments?.length]);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 500) return;
    addComment.mutate(
      { postId, content: trimmed },
      { onSuccess: () => setContent('') }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = (commentId: number) => {
    deleteComment.mutate({ postId, commentId });
  };

  const isOverLimit = content.length > 500;
  const showCounter = content.length > 400;

  return (
    <div className="mt-2">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <MessageCircle className="size-3.5" />
        {isOpen ? 'Hide comments' : displayCount > 0 ? `View ${displayCount} comment${displayCount !== 1 ? 's' : ''}` : 'Comment'}
      </button>

      {isOpen && (
        <div className="mt-2">
          {/* Comment list */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-2 p-2">
                  <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments && comments.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id}
                  onDelete={handleDelete}
                  isDeleting={deleteComment.isPending}
                />
              ))}
              <div ref={listEndRef} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No comments yet. Be the first!
            </p>
          )}

          {/* Comment input */}
          {user && (
            <div className="flex gap-2 mt-2">
              <Input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
                className="flex-1 text-sm"
                maxLength={501}
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim() || isOverLimit || addComment.isPending}
                className="shrink-0"
              >
                {addComment.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          )}
          {showCounter && (
            <div className={`text-xs mt-1 text-right ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
              {content.length}/500
            </div>
          )}
        </div>
      )}
    </div>
  );
}
