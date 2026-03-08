'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ChefHat, Camera, Trophy, Clock } from 'lucide-react';
import { CommentSection } from '@/components/post-comments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import {
  useUserProfile,
  useUserPosts,
  useFollowUser,
  useUnfollowUser,
} from '@/hooks/use-social';
import type { UserPost } from '@/lib/types';
import Link from 'next/link';

// ── Helpers ──

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear}y ago`;
}

function getInitial(displayName: string | null, username: string): string {
  const name = displayName || username;
  return name.charAt(0).toUpperCase();
}

// ── Avatar ──

function Avatar({
  avatarUrl,
  displayName,
  username,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  username: string;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName || username}
        className="size-20 rounded-full object-cover border-2 border-cq-border"
      />
    );
  }

  return (
    <div className="size-20 rounded-full bg-cq-primary flex items-center justify-center text-white text-2xl font-bold border-2 border-cq-border">
      {getInitial(displayName, username)}
    </div>
  );
}

// ── Follow Button ──

function FollowButton({
  userId,
  isFollowing,
}: {
  userId: number;
  isFollowing: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  const handleClick = () => {
    if (isPending) return;
    if (isFollowing) {
      unfollowMutation.mutate(userId);
    } else {
      followMutation.mutate(userId);
    }
  };

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`min-w-[100px] transition-colors ${
          isHovered
            ? 'border-red-500 text-red-500 hover:bg-red-500/10'
            : 'border-cq-border text-cq-text-secondary'
        }`}
      >
        {isHovered ? 'Unfollow' : 'Following'}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={handleClick}
      className="min-w-[100px] bg-cq-primary text-white hover:bg-cq-primary/90"
    >
      Follow
    </Button>
  );
}

// ── Activity Item ──

function ActivityItem({ post }: { post: UserPost }) {
  let icon = <ChefHat className="size-4 text-orange-400" />;
  let label = '';

  switch (post.postType) {
    case 'recipe_completed':
      icon = <ChefHat className="size-4 text-green-400" />;
      label = `Completed "${post.recipeTitle}"`;
      break;
    case 'photo_upload':
      icon = <Camera className="size-4 text-blue-400" />;
      label = `Shared a photo of "${post.recipeTitle}"`;
      break;
    case 'milestone':
      icon = <Trophy className="size-4 text-yellow-400" />;
      label = post.caption || 'Reached a milestone!';
      break;
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-cq-border last:border-b-0">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-cq-text-primary truncate">{label}</p>
        {post.postType === 'recipe_completed' && post.recipeImageUrl && (
          <div className="mt-2">
            <img
              src={post.recipeImageUrl}
              alt={post.recipeTitle || 'Recipe'}
              className="h-16 w-24 object-cover rounded-lg"
            />
          </div>
        )}
        {post.postType === 'photo_upload' && post.photoUrl && (
          <div className="mt-2">
            <img
              src={post.photoUrl}
              alt={post.recipeTitle || 'Photo'}
              className="h-16 w-24 object-cover rounded-lg"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-cq-text-muted whitespace-nowrap">
        <Clock className="size-3" />
        {relativeTime(post.createdAt)}
      </div>
    </div>
  );
}

// ── Loading Skeleton ──

function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Skeleton className="h-8 w-24" />
      <div className="bg-cq-surface border border-cq-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex gap-6 mt-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <div className="bg-cq-surface border border-cq-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function ProfilePage() {
  const params = useParams();
  const userId = Number(params.userId);
  const { user: currentUser } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
  } = useUserProfile(userId);

  const {
    data: posts,
    isLoading: postsLoading,
  } = useUserPosts(userId);

  const isOwnProfile = currentUser?.id === userId;

  // Invalid userId
  if (isNaN(userId) || userId <= 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-400 text-lg font-medium">User not found</div>
        <Link href="/">
          <Button variant="outline" className="border-cq-border text-cq-text-secondary">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // Loading
  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  // Error or not found
  if (profileError || !profile) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-red-400 text-lg font-medium">User not found</div>
        <Link href="/">
          <Button variant="outline" className="border-cq-border text-cq-text-secondary">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const recentPosts = posts?.slice(0, 10) ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <Link href="/">
        <Button variant="ghost" size="sm" className="text-cq-text-muted hover:text-cq-text-primary">
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
      </Link>

      {/* Profile header card */}
      <div className="bg-cq-surface border border-cq-border rounded-xl p-6">
        <div className="flex items-center gap-4">
          <Avatar
            avatarUrl={profile.avatarUrl}
            displayName={profile.displayName}
            username={profile.username}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-cq-text-primary truncate">
              {profile.displayName || profile.username}
            </h1>
            <p className="text-sm text-cq-text-muted">@{profile.username}</p>
          </div>
          {!isOwnProfile && (
            <FollowButton
              userId={profile.id}
              isFollowing={profile.isFollowing ?? false}
            />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-6 pt-4 border-t border-cq-border">
          <div className="text-center">
            <div className="text-lg font-bold text-cq-text-primary">
              {profile.followersCount}
            </div>
            <div className="text-sm text-cq-text-secondary">Followers</div>
          </div>
          <div className="text-cq-text-muted">·</div>
          <div className="text-center">
            <div className="text-lg font-bold text-cq-text-primary">
              {profile.followingCount}
            </div>
            <div className="text-sm text-cq-text-secondary">Following</div>
          </div>
          <div className="text-cq-text-muted">·</div>
          <div className="text-center">
            <div className="text-lg font-bold text-cq-text-primary">
              {profile.totalRecipesCompleted}
            </div>
            <div className="text-sm text-cq-text-secondary">Recipes Completed</div>
          </div>
        </div>
      </div>

      {/* Recent Activity card */}
      <div className="bg-cq-surface border border-cq-border rounded-xl p-6">
        <h2 className="text-base font-semibold text-cq-text-primary mb-4">
          Recent Activity
        </h2>

        {postsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        ) : recentPosts.length > 0 ? (
          <div>
            {recentPosts.map((post) => (
              <div key={post.id}>
                <ActivityItem post={post} />
                <CommentSection postId={post.id} commentsCount={post.commentsCount || 0} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-cq-text-muted py-4 text-center">
            No recent activity yet.
          </p>
        )}
      </div>
    </div>
  );
}
