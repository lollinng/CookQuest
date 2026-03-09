'use client';

import { Bell, Heart, UserPlus, MessageCircle, Check } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useNotifications, useMarkAllNotificationsRead } from '@/hooks/use-social';
import { getAvatarColor, getInitials, formatRelativeTime } from '@/lib/social-helpers';
import type { Notification } from '@/lib/types';

function NotificationItem({ notification: n }: { notification: Notification }) {
  const icon = n.type === 'follow'
    ? <UserPlus className="size-4 text-cq-primary" />
    : n.type === 'post_like'
    ? <Heart className="size-4 text-red-500 fill-red-500" />
    : n.type === 'comment'
    ? <MessageCircle className="size-4 text-blue-400" />
    : <Heart className="size-4 text-red-400" />;

  const actionText = n.type === 'follow'
    ? 'followed you'
    : n.type === 'post_like'
    ? 'liked your post'
    : n.type === 'comment'
    ? 'commented on your post'
    : 'liked your comment';

  const displayName = n.actorDisplayName ?? n.actorUsername;
  const href = n.type === 'follow' ? `/profile/${n.actorId}` : n.postId ? '/feed' : '#';

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
        n.isRead
          ? 'hover:bg-cq-surface-hover'
          : 'bg-cq-primary/5 hover:bg-cq-primary/10'
      }`}
    >
      {/* Unread dot */}
      <div className="pt-2 w-2 shrink-0">
        {!n.isRead && <div className="size-2 rounded-full bg-cq-primary" />}
      </div>

      {/* Avatar */}
      {n.actorAvatarUrl ? (
        <img
          src={n.actorAvatarUrl}
          alt={n.actorUsername}
          className="size-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${getAvatarColor(n.actorUsername)}`}>
          {getInitials(displayName)}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cq-text-primary">
          <span className="font-semibold">{n.actorUsername}</span>{' '}
          <span className="text-cq-text-secondary">{actionText}</span>
        </p>
        {n.postCaption && (
          <p className="text-xs text-cq-text-muted mt-0.5 truncate">
            &quot;{n.postCaption.length > 60 ? n.postCaption.slice(0, 60) + '...' : n.postCaption}&quot;
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          {icon}
          <span className="text-xs text-cq-text-muted">{formatRelativeTime(n.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="w-2 shrink-0" />
      <Skeleton className="size-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: notifications, isLoading } = useNotifications(50);
  const markAllRead = useMarkAllNotificationsRead();
  const unreadExist = notifications?.some(n => !n.isRead);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Bell className="size-12 text-cq-text-muted" />
        <p className="text-cq-text-secondary">Sign in to see your notifications</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cq-text-primary">Notifications</h1>
        {unreadExist && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-sm text-cq-primary hover:text-cq-primary/80 transition-colors disabled:opacity-50"
          >
            <Check className="size-4" />
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Notification list */}
      {!isLoading && notifications && notifications.length > 0 && (
        <div className="space-y-1">
          {notifications.map(n => (
            <NotificationItem key={n.id} notification={n} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notifications?.length === 0 && (
        <div className="text-center py-16">
          <Bell className="size-12 mx-auto text-cq-text-muted mb-3" />
          <p className="text-cq-text-secondary">No notifications yet</p>
          <p className="text-sm text-cq-text-muted mt-1">
            When people follow you or like your posts, you&apos;ll see it here
          </p>
        </div>
      )}
    </div>
  );
}
