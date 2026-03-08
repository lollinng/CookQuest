'use client';

import { useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RecipeCard } from '@/components/recipe-card';
import { RecipeFilterBar } from '@/components/recipe-filter-bar';
import { useFilteredRecipes, useSkills } from '@/hooks/use-recipes';
import { useRecipeStore, useStoreHydrated } from '@/lib/stores/recipe-store';
import { useCoreLoopState } from '@/hooks/use-core-loop';
import type { RecipeFilters } from '@/lib/api/recipes';
import Link from 'next/link';

function RecipesBrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useStoreHydrated();
  const { isRecipeCompleted, toggleRecipeCompletion } = useRecipeStore();
  const coreLoop = useCoreLoopState();
  const { data: skills } = useSkills();

  const filters: RecipeFilters = useMemo(() => ({
    skill: (searchParams.get('skill') as any) || undefined,
    difficulty: (searchParams.get('difficulty') as any) || undefined,
    sort: searchParams.get('sort') || 'title',
    search: searchParams.get('search') || undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: 12,
  }), [searchParams]);

  const setFilters = useCallback((f: RecipeFilters) => {
    const params = new URLSearchParams();
    if (f.skill) params.set('skill', f.skill);
    if (f.difficulty) params.set('difficulty', f.difficulty);
    if (f.sort && f.sort !== 'title') params.set('sort', f.sort);
    if (f.search) params.set('search', f.search);
    if (f.page && f.page > 1) params.set('page', String(f.page));
    router.push(`/recipes?${params.toString()}`, { scroll: false });
  }, [router]);

  const { data, isLoading } = useFilteredRecipes(filters);
  const recipes = data?.recipes || [];
  const pagination = data?.pagination;

  const skillsList = useMemo(() =>
    skills?.map(s => ({ id: s.id, name: s.name })) || [],
    [skills]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-cq-text-muted hover:text-cq-text-primary hover:bg-cq-surface">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-cq-text-primary flex items-center gap-2">
            <UtensilsCrossed className="size-6 text-cq-primary" />
            All Recipes
          </h1>
          {pagination && (
            <p className="text-sm text-cq-text-muted mt-0.5">
              {pagination.total} recipe{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <RecipeFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        skills={skillsList}
      />

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden bg-cq-surface border-cq-border">
              <Skeleton className="h-40 w-full bg-cq-border" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-cq-border" />
                <Skeleton className="h-3 w-full bg-cq-border" />
                <Skeleton className="h-3 w-1/2 bg-cq-border" />
              </div>
            </Card>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🍳</div>
          <h3 className="text-lg font-semibold text-cq-text-primary mb-2">No recipes found</h3>
          <p className="text-cq-text-muted mb-4">Try adjusting your filters or search term.</p>
          <Button
            variant="outline"
            onClick={() => setFilters({ page: 1, limit: 12 })}
            className="border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => {
            const recipeLocked = recipe.skill !== 'basic-cooking' && !coreLoop.isBasicCookingComplete;
            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                isCompleted={hydrated && isRecipeCompleted(recipe.id)}
                onToggleCompletion={toggleRecipeCompletion}
                isLocked={recipeLocked}
              />
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page === 1}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
            className="border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover disabled:opacity-40"
          >
            Previous
          </Button>
          <span className="text-sm text-cq-text-muted px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
            className="border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover disabled:opacity-40"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RecipesBrowsePage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 bg-cq-border" />
        <Skeleton className="h-32 w-full bg-cq-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden bg-cq-surface border-cq-border">
              <Skeleton className="h-40 w-full bg-cq-border" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4 bg-cq-border" />
                <Skeleton className="h-3 w-full bg-cq-border" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    }>
      <RecipesBrowseContent />
    </Suspense>
  );
}
