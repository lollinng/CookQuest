'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Globe, Heart, MessageCircle, Trophy, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { useFeed, useWorldFeed } from '@/hooks/use-social';
import { FeedPostCard } from '@/components/feed-post-card';
import { FeedPostComposer } from '@/components/feed-post-composer';
import { DemoModeBanner } from '@/components/onboarding/demo-mode-banner';
import { useDemoFeed } from '@/hooks/use-onboarding';

type FeedTab = 'world' | 'friends';
type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

function DemoFeedCard({ post }: { post: any }) {
  return (
    <div className="bg-cq-surface border border-cq-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.avatarUrl} alt={post.username} className="w-10 h-10 rounded-full object-cover" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-cq-text-primary">{post.username}</span>
          <p className="text-xs text-muted-foreground">
            {post.type === 'recipe_completed' ? `Completed ${post.recipeTitle}` :
             post.type === 'photo_upload' ? `Shared a photo of ${post.recipeTitle}` :
             'Reached a milestone'}
          </p>
        </div>
      </div>

      {post.type === 'milestone' ? (
        <div className="px-4 py-8 bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex flex-col items-center gap-2">
          <Trophy className="size-10 text-amber-400" />
          <p className="text-lg font-semibold text-cq-text-primary text-center">{post.caption}</p>
        </div>
      ) : post.photoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.photoUrl} alt={post.recipeTitle || 'Post'} className="w-full aspect-[4/3] object-cover" loading="lazy" />
      ) : null}

      <div className="px-4 py-3 space-y-1">
        {post.caption && post.type !== 'milestone' && (
          <p className="text-sm text-cq-text-secondary">{post.caption}</p>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2 border-t border-cq-border/50">
        <span className="flex items-center gap-1.5 text-sm text-cq-text-muted">
          <Heart className="size-5" />
          {post.likes > 0 && <span className="font-medium">{post.likes}</span>}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-cq-text-muted">
          <MessageCircle className="size-5" />
          {post.comments > 0 && <span className="font-medium">{post.comments}</span>}
        </span>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState<FeedTab>('world');
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);

  const worldFeed = useWorldFeed(30, difficulty === 'all' ? undefined : difficulty);
  const friendsFeed = useFeed();
  const { data: demoPosts } = useDemoFeed();

  const { data: posts, isLoading } = tab === 'world' ? worldFeed : friendsFeed;

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-cq-text-primary">Feed</h1>
        <DemoModeBanner
          title="See what other cooks are making!"
          subtitle="Follow people to build your personalized feed."
        />
        {demoPosts && (
          <div className="flex flex-col gap-6">
            {demoPosts.map((post) => (
              <DemoFeedCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cq-text-primary">Feed</h1>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-cq-primary text-white hover:bg-cq-primary-hover transition-colors"
            >
              <Plus className="size-4" />
              <span>New Post</span>
            </button>
          )}
        <div className="flex items-center bg-cq-surface border border-cq-border rounded-full p-1">
          <button
            onClick={() => setTab('world')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'world'
                ? 'bg-cq-primary text-white'
                : 'text-cq-text-secondary hover:text-cq-text-primary'
            }`}
          >
            <Globe className="size-3.5" />
            World
          </button>
          <button
            onClick={() => { setTab('friends'); setDifficulty('all'); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === 'friends'
                ? 'bg-cq-primary text-white'
                : 'text-cq-text-secondary hover:text-cq-text-primary'
            }`}
          >
            <Users className="size-3.5" />
            Friends
          </button>
        </div>
        </div>
      </div>

      {tab === 'world' && (
        <div className="flex items-center gap-2">
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                difficulty === level
                  ? 'bg-cq-primary/15 text-cq-primary border border-cq-primary/30'
                  : 'bg-cq-surface border border-cq-border text-cq-text-secondary hover:text-cq-text-primary hover:border-cq-text-muted'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {isLoading && <FeedSkeletons />}

      {!isLoading && posts && posts.length === 0 && (
        <div className="bg-cq-surface border border-cq-border rounded-xl p-8 text-center space-y-4">
          {tab === 'world' && difficulty !== 'all' ? (
            <>
              <Globe className="size-12 mx-auto text-cq-text-muted" />
              <p className="text-cq-text-secondary">No {difficulty} posts yet</p>
            </>
          ) : tab === 'world' ? (
            <>
              <Globe className="size-12 mx-auto text-cq-text-muted" />
              <p className="text-cq-text-secondary">No posts yet. Be the first to share!</p>
            </>
          ) : (
            <>
              <Users className="size-12 mx-auto text-cq-text-muted" />
              <p className="text-cq-text-secondary">Follow people to see their cooking activity</p>
              <Link href="/people">
                <Button className="bg-cq-primary text-white hover:bg-cq-primary/90">
                  Find people to follow
                </Button>
              </Link>
            </>
          )}
        </div>
      )}

      {!isLoading && posts && posts.length > 0 && (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <FeedPostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* FAB + Composer */}
      {isAuthenticated && (
        <>
          <button
            onClick={() => setComposerOpen(true)}
            className="fixed bottom-20 right-6 z-50 size-14 rounded-full bg-cq-primary text-white shadow-lg shadow-cq-primary/25 hover:bg-cq-primary-hover transition-colors flex items-center justify-center"
            aria-label="New post"
          >
            <Plus className="size-6" />
          </button>
          <FeedPostComposer
            isOpen={composerOpen}
            onClose={() => setComposerOpen(false)}
          />
        </>
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
