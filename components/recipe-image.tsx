'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isValidImageUrl } from '@/lib/validation'

const SKILL_GRADIENTS: Record<string, string> = {
  'basic-cooking': 'bg-gradient-to-br from-blue-200 via-sky-100 to-cyan-200',
  'heat-control': 'bg-gradient-to-br from-orange-200 via-red-100 to-amber-200',
  'flavor-building': 'bg-gradient-to-br from-purple-200 via-pink-100 to-violet-200',
  'air-fryer': 'bg-gradient-to-br from-emerald-200 via-teal-100 to-cyan-200',
  'indian-cuisine': 'bg-gradient-to-br from-amber-200 via-yellow-100 to-orange-200',
};

const SKILL_GRADIENTS_HERO: Record<string, string> = {
  'basic-cooking': 'bg-gradient-to-br from-blue-300 via-sky-200 to-cyan-300',
  'heat-control': 'bg-gradient-to-br from-orange-300 via-red-200 to-amber-300',
  'flavor-building': 'bg-gradient-to-br from-purple-300 via-pink-200 to-violet-300',
  'air-fryer': 'bg-gradient-to-br from-emerald-300 via-teal-200 to-cyan-300',
  'indian-cuisine': 'bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-300',
};

interface RecipeImageProps {
  src: string;
  alt: string;
  skill: string;
  emoji?: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  emojiSize?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'hero';
}

export function RecipeImage({
  src,
  alt,
  skill,
  emoji = '🍳',
  fill = true,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  className = '',
  emojiSize = 'md',
  variant = 'card',
}: RecipeImageProps) {
  const [hasError, setHasError] = useState(false);
  const showImage = src && isValidImageUrl(src) && !hasError;

  const gradients = variant === 'hero' ? SKILL_GRADIENTS_HERO : SKILL_GRADIENTS;
  const gradient = gradients[skill] || gradients['basic-cooking'];

  const emojiSizeClass = emojiSize === 'sm' ? 'text-5xl' : emojiSize === 'lg' ? 'text-8xl' : 'text-6xl';

  if (showImage) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        className={`object-cover ${className}`}
        sizes={sizes}
        priority={priority}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center h-full ${gradient}`}>
      <span className={`${emojiSizeClass} drop-shadow-md`}>{emoji}</span>
    </div>
  );
}
