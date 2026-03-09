'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Trash2, Send, Loader2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { usePostComments, useAddComment, useDeleteComment, useToggleCommentLike } from '@/hooks/use-social';
import { getAvatarColor, getInitials, formatRelativeTime } from '@/lib/social-helpers';
import type { PostComment } from '@/lib/types';

// ── Comment Item ──

function CommentItem({
  comment,
  postId,
  currentUserId,
  onDelete,
  isDeleting,
  onToggleLike,
}: {
  comment: PostComment;
  postId: number;
  currentUserId: number | undefined;
  onDelete: (commentId: number) => void;
  isDeleting: boolean;
  onToggleLike: (postId: number, commentId: number) => void;
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
      <div className="flex items-center gap-1 shrink-0 mt-1">
        {currentUserId && (
          <button
            onClick={() => onToggleLike(postId, comment.id)}
            className="flex items-center gap-1 text-xs"
            aria-label={comment.isLiked ? 'Unlike comment' : 'Like comment'}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                comment.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-400'
              }`}
            />
            {comment.likesCount > 0 && (
              <span className={comment.isLiked ? 'text-red-500' : 'text-muted-foreground'}>
                {comment.likesCount}
              </span>
            )}
          </button>
        )}
        {isOwn && (
          <button
            onClick={() => onDelete(comment.id)}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete comment"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
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
  const toggleLike = useToggleCommentLike();

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
                  postId={postId}
                  currentUserId={user?.id}
                  onDelete={handleDelete}
                  isDeleting={deleteComment.isPending}
                  onToggleLike={(pId, cId) => toggleLike.mutate({ postId: pId, commentId: cId })}
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
