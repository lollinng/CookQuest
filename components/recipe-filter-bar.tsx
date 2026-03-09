'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RecipeFilters } from '@/lib/api/recipes';

interface RecipeFilterBarProps {
  filters: RecipeFilters;
  onFiltersChange: (filters: RecipeFilters) => void;
  skills: Array<{ id: string; name: string }>;
}

const SORT_OPTIONS = [
  { value: 'title', label: 'Title A-Z' },
  { value: '-title', label: 'Title Z-A' },
  { value: 'difficulty', label: 'Easiest First' },
  { value: '-difficulty', label: 'Hardest First' },
  { value: 'time', label: 'Quickest First' },
  { value: '-xp', label: 'Most XP' },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: undefined, label: 'All' },
  { value: 'beginner' as const, label: 'Beginner' },
  { value: 'intermediate' as const, label: 'Intermediate' },
  { value: 'advanced' as const, label: 'Advanced' },
];

export function RecipeFilterBar({ filters, onFiltersChange, skills }: RecipeFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== (filters.search || '')) {
        onFiltersChange({ ...filters, search: trimmed || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilterCount = [
    filters.skill,
    filters.difficulty,
    filters.search,
    filters.sort && filters.sort !== 'title' ? filters.sort : undefined,
  ].filter(Boolean).length;

  const clearAll = useCallback(() => {
    setSearchInput('');
    onFiltersChange({ page: 1, limit: filters.limit });
  }, [onFiltersChange, filters.limit]);

  return (
    <div className="space-y-4">
      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cq-text-muted" />
          <Input
            placeholder="Search recipes..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 bg-cq-surface border-cq-border text-cq-text-primary placeholder:text-cq-text-muted focus:border-cq-border-accent"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-cq-text-muted hover:text-cq-text-secondary"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <Select
          value={filters.sort || 'title'}
          onValueChange={(value) => onFiltersChange({ ...filters, sort: value, page: 1 })}
        >
          <SelectTrigger className="w-full sm:w-[180px] bg-cq-surface border-cq-border text-cq-text-primary">
            <SlidersHorizontal className="size-4 mr-2 text-cq-text-muted" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-cq-surface border-cq-border">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-cq-text-secondary focus:bg-cq-surface-hover focus:text-cq-text-primary"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Skill pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onFiltersChange({ ...filters, skill: undefined, page: 1 })}
          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
            !filters.skill
              ? 'bg-cq-primary text-cq-primary-text font-medium'
              : 'bg-cq-surface border border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover hover:text-cq-text-primary'
          }`}
        >
          All Skills
        </button>
        {skills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => onFiltersChange({ ...filters, skill: filters.skill === skill.id ? undefined : skill.id as RecipeFilters['skill'], page: 1 })}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
              filters.skill === skill.id
                ? 'bg-cq-primary text-cq-primary-text font-medium'
                : 'bg-cq-surface border border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover hover:text-cq-text-primary'
            }`}
          >
            {skill.name}
          </button>
        ))}
      </div>

      {/* Difficulty pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onFiltersChange({ ...filters, difficulty: opt.value, page: 1 })}
            className={`flex-shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors ${
              filters.difficulty === opt.value || (!filters.difficulty && !opt.value)
                ? 'bg-cq-primary text-cq-primary-text font-medium'
                : 'bg-cq-surface border border-cq-border text-cq-text-secondary hover:bg-cq-surface-hover hover:text-cq-text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Active filter count + clear */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="bg-cq-primary text-cq-primary-text text-xs rounded-full px-1.5 min-w-[18px] text-center font-medium">
            {activeFilterCount}
          </span>
          <span className="text-cq-text-muted text-sm">active filter{activeFilterCount !== 1 ? 's' : ''}</span>
          <button
            onClick={clearAll}
            className="text-cq-text-muted hover:text-cq-primary text-sm ml-1"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
