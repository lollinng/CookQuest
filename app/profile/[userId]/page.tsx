'use client';

import { useParams } from 'next/navigation';
import { useState, useRef } from 'react';
import { ArrowLeft, ChefHat, Camera, Trophy, Clock, Loader2 } from 'lucide-react';
import { CommentSection } from '@/components/post-comments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import {
  useUserProfile,
  useUserPosts,
  useUserSkillTrophies,
  useUserFollowers,
  useUserFollowing,
  useFollowUser,
  useUnfollowUser,
  useUploadAvatar,
} from '@/hooks/use-social';
import type { FollowUser } from '@/lib/types';
import { toast } from 'sonner';
import type { UserPost, SkillTrophy } from '@/lib/types';
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
  isOwnProfile = false,
  onAvatarChange,
  isUploading = false,
}: {
  avatarUrl: string | null;
  displayName: string | null;
  username: string;
  isOwnProfile?: boolean;
  onAvatarChange?: (file: File) => void;
  isUploading?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (isOwnProfile && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAvatarChange) {
      onAvatarChange(file);
    }
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const avatarContent = avatarUrl ? (
    <img
      src={avatarUrl}
      alt={displayName || username}
      className="size-20 rounded-full object-cover border-2 border-cq-border"
    />
  ) : (
    <div className="size-20 rounded-full bg-cq-primary flex items-center justify-center text-white text-2xl font-bold border-2 border-cq-border">
      {getInitial(displayName, username)}
    </div>
  );

  if (!isOwnProfile) return avatarContent;

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="relative rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cq-primary"
      >
        {avatarContent}
        {isUploading ? (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Loader2 className="size-6 text-white animate-spin" />
          </div>
        ) : (
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Camera className="size-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
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

// ── Follow List Modal ──

function UserListItem({
  user,
  currentUserId,
  onClose,
}: {
  user: FollowUser;
  currentUserId?: number;
  onClose: () => void;
}) {
  const initial = getInitial(user.displayName || null, user.username);

  return (
    <div className="flex items-center gap-3 py-3 px-2 hover:bg-white/5 rounded-lg transition-colors">
      <Link href={`/profile/${user.id}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName || user.username}
            className="size-10 rounded-full object-cover border border-cq-border shrink-0"
          />
        ) : (
          <div className="size-10 rounded-full bg-cq-primary flex items-center justify-center text-white text-sm font-bold border border-cq-border shrink-0">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-cq-text-primary truncate">
            {user.displayName || user.username}
          </p>
          <p className="text-xs text-cq-text-muted">@{user.username}</p>
        </div>
      </Link>
      {currentUserId && currentUserId !== user.id && (
        <FollowButton userId={user.id} isFollowing={user.isFollowing ?? false} />
      )}
    </div>
  );
}

function FollowListModal({
  userId,
  type,
  count,
}: {
  userId: number;
  type: 'followers' | 'following';
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const { user: currentUser } = useAuth();

  const followersQuery = useUserFollowers(userId);
  const followingQuery = useUserFollowing(userId);
  const { data, isLoading } = type === 'followers' ? followersQuery : followingQuery;

  const title = type === 'followers' ? 'Followers' : 'Following';
  const emptyMessage = type === 'followers' ? 'No followers yet' : 'Not following anyone yet';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-center cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-lg font-bold text-cq-text-primary">{count}</div>
          <div className="text-sm text-cq-text-secondary">{title}</div>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-cq-surface border-cq-border max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-cq-text-primary">{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : data && data.length > 0 ? (
            <div>
              {data.map((user) => (
                <UserListItem
                  key={user.id}
                  user={user}
                  currentUserId={currentUser?.id}
                  onClose={() => setOpen(false)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-cq-text-muted py-8 text-center">{emptyMessage}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
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

// ── Trophy Card ──

function TrophyCard({ trophy }: { trophy: SkillTrophy }) {
  const isMastered = trophy.mastered;

  return (
    <div
      className={`relative rounded-xl border p-3 text-center transition-all ${
        isMastered
          ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/20 to-amber-600/10 shadow-lg shadow-amber-500/20'
          : 'border-cq-border bg-cq-surface grayscale opacity-60'
      }`}
    >
      <div className="text-3xl mb-1">{trophy.icon}</div>
      <div className={`text-xs font-medium truncate ${
        isMastered ? 'text-cq-text-primary' : 'text-cq-text-muted'
      }`}>
        {trophy.skillName}
      </div>
      {isMastered ? (
        <div className="text-[10px] font-bold text-amber-400 mt-1 uppercase tracking-wider">
          Mastered
        </div>
      ) : (
        <>
          <div className="text-[10px] text-cq-text-muted mt-1">
            {trophy.completed}/{trophy.total}
          </div>
          <div className="mt-1.5 h-1 rounded-full bg-cq-border overflow-hidden">
            <div
              className="h-full rounded-full bg-cq-text-muted transition-all"
              style={{ width: `${trophy.percentage}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ── Trophies Section ──

function TrophiesSection({ userId }: { userId: number }) {
  const { data: trophies, isLoading } = useUserSkillTrophies(userId);

  return (
    <div className="bg-cq-surface border border-cq-border rounded-xl p-6">
      <h2 className="text-base font-semibold text-cq-text-primary mb-4 flex items-center gap-2">
        <Trophy className="size-4 text-amber-400" />
        Trophies
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {trophies?.map((trophy) => (
            <TrophyCard key={trophy.skillId} trophy={trophy} />
          ))}
        </div>
      )}
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

  const uploadAvatarMutation = useUploadAvatar();
  const isOwnProfile = currentUser?.id === userId;

  const handleAvatarChange = (file: File) => {
    uploadAvatarMutation.mutate(file, {
      onSuccess: () => {
        toast.success('Avatar updated!');
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to upload avatar');
      },
    });
  };

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
            isOwnProfile={isOwnProfile}
            onAvatarChange={handleAvatarChange}
            isUploading={uploadAvatarMutation.isPending}
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
          <FollowListModal userId={userId} type="followers" count={profile.followersCount} />
          <div className="text-cq-text-muted">·</div>
          <FollowListModal userId={userId} type="following" count={profile.followingCount} />
          <div className="text-cq-text-muted">·</div>
          <div className="text-center">
            <div className="text-lg font-bold text-cq-text-primary">
              {profile.totalRecipesCompleted}
            </div>
            <div className="text-sm text-cq-text-secondary">Recipes Completed</div>
          </div>
        </div>
      </div>

      {/* Trophies section */}
      <TrophiesSection userId={userId} />

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
