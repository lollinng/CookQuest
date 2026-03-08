'use client';

import Link from 'next/link';
import { ChefHat, Heart, UtensilsCrossed } from 'lucide-react';
import { UserMenu } from '@/components/auth/user-menu';
import { useAuth } from '@/lib/auth-context';
import { useFavoriteRecipes } from '@/hooks/use-recipes';

export function TopNav() {
  const { isAuthenticated } = useAuth();
  const { data: favorites } = useFavoriteRecipes();
  const favCount = favorites?.length ?? 0;

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

          {/* Favorites link */}
          <Link
            href="/favorites"
            data-testid="nav-favorites-link"
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-cq-text-secondary hover:text-rose-400 hover:bg-cq-surface-hover transition-colors"
          >
            <Heart className={`size-4 ${isAuthenticated && favCount > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
            <span className="hidden sm:inline">Favorites</span>
            {isAuthenticated && favCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full size-4 flex items-center justify-center leading-none">
                {favCount > 9 ? '9+' : favCount}
              </span>
            )}
          </Link>

          {/* User Menu / Auth */}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
