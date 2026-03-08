'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useFeed } from '@/hooks/use-social';
import { FeedPostCard } from '@/components/feed-post-card';

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: posts, isLoading } = useFeed();

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-cq-text-secondary">Sign in to see your feed</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-cq-text-primary">Feed</h1>

      {isLoading && <FeedSkeletons />}

      {!isLoading && posts && posts.length === 0 && (
        <div className="bg-cq-surface border border-cq-border rounded-xl p-8 text-center space-y-4">
          <Users className="size-12 mx-auto text-cq-text-muted" />
          <p className="text-cq-text-secondary">Follow people to see their cooking activity</p>
          <Link href="/people">
            <Button className="bg-cq-primary text-white hover:bg-cq-primary/90">
              Find people to follow
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && posts && posts.length > 0 && (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedSkeletons() {
  return (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-cq-surface border border-cq-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="w-full aspect-[4/3]" />
          <div className="px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}
