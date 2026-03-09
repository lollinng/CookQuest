'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, ChefHat, Download, Flame, Heart, Newspaper, Users, UtensilsCrossed } from 'lucide-react';
import { UserMenu } from '@/components/auth/user-menu';
import { useAuth } from '@/lib/auth-context';
import { useFavoriteRecipes } from '@/hooks/use-recipes';
import { useUnreadNotificationCount } from '@/hooks/use-social';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';

export function TopNav() {
  const { isAuthenticated } = useAuth();
  const { data: favorites } = useFavoriteRecipes();
  const favCount = favorites?.length ?? 0;
  const { data: unreadData } = useUnreadNotificationCount();
  const unreadCount = isAuthenticated ? (unreadData?.count ?? 0) : 0;
  const { shouldShow: shouldShowInstall, canInstall, promptInstall } = usePWAInstall();
  const [showInstallSheet, setShowInstallSheet] = useState(false);

  return (
    <nav
      data-testid="top-nav"
      className="sticky top-0 z-50 bg-cq-bg/80 backdrop-blur-md border-b border-cq-border"
    >
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-cq-text-primary hover:opacity-90 transition-opacity">
          <ChefHat className="size-6 text-cq-primary" />
          <span className="hidden sm:inline">CookQuest</span>
        </Link>

        {/* Right: Nav items */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Recipes link */}
          <Link
            href="/recipes"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-cq-text-primary hover:bg-cq-surface-hover transition-colors"
          >
            <UtensilsCrossed className="size-4" />
            <span className="hidden sm:inline">Recipes</span>
          </Link>

          {/* Indian Plan link */}
          <Link
            href="/indian-cooking"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-amber-500 hover:bg-cq-surface-hover transition-colors"
          >
            <Flame className="size-4 text-amber-500" />
            <span className="hidden sm:inline">Indian Plan</span>
          </Link>

          {/* Favorites link */}
          <Link
            href="/favorites"
            data-testid="nav-favorites-link"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-rose-400 hover:bg-cq-surface-hover transition-colors"
          >
            <Heart className={`size-4 ${favCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
            <span className="hidden sm:inline">Favorites</span>
            {favCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center leading-none">
                {favCount > 9 ? '9+' : favCount}
              </span>
            )}
          </Link>

          {/* People link */}
          <Link
            href="/people"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-cq-text-primary hover:bg-cq-surface-hover transition-colors"
          >
            <Users className="size-4" />
            <span className="hidden sm:inline">People</span>
          </Link>

          {/* Feed link */}
          <Link
            href="/feed"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-cq-text-primary hover:bg-cq-surface-hover transition-colors"
          >
            <Newspaper className="size-4" />
            <span className="hidden sm:inline">Feed</span>
          </Link>

          {/* Notifications bell */}
          {isAuthenticated && (
            <Link
              href="/notifications"
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-cq-text-primary hover:bg-cq-surface-hover transition-colors"
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Install App */}
          {shouldShowInstall && (
            <button
              onClick={() => {
                if (canInstall) {
                  promptInstall();
                } else {
                  setShowInstallSheet(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* User Menu / Auth */}
          <UserMenu />
        </div>
      </div>

      <PWAInstallPrompt
        isOpen={showInstallSheet}
        onClose={() => setShowInstallSheet(false)}
      />
    </nav>
  );
}
