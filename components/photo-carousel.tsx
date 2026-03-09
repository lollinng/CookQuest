'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoCarouselProps {
  photos: string[]
  aspectRatio?: string
  className?: string
}

export function PhotoCarousel({ photos, aspectRatio = '4/3', className = '' }: PhotoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const scrollToIndex = useCallback((index: number) => {
    const container = scrollRef.current
    if (!container) return
    const child = container.children[index] as HTMLElement
    if (child) {
      container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' })
    }
  }, [])

  const handleScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    const scrollLeft = container.scrollLeft
    const width = container.clientWidth
    const newIndex = Math.round(scrollLeft / width)
    setActiveIndex(Math.min(newIndex, photos.length - 1))
  }, [photos.length])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Single photo — no carousel controls
  if (photos.length <= 1) {
    return (
      <div className={className}>
        {photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photos[0]}
            alt="Post photo"
            className="w-full object-cover"
            style={{ aspectRatio }}
            loading="lazy"
          />
        )}
      </div>
    )
  }

  const goNext = () => {
    if (activeIndex < photos.length - 1) scrollToIndex(activeIndex + 1)
  }

  const goPrev = () => {
    if (activeIndex > 0) scrollToIndex(activeIndex - 1)
  }

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {photos.map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={photo}
            alt={`Photo ${i + 1} of ${photos.length}`}
            className="w-full flex-shrink-0 snap-start object-cover"
            style={{ aspectRatio }}
            loading="lazy"
          />
        ))}
      </div>

      {/* Photo counter badge */}
      <div className="absolute top-3 right-3 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full">
        {activeIndex + 1}/{photos.length}
      </div>

      {/* Left arrow */}
      {isHovered && activeIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Right arrow */}
      {isHovered && activeIndex < photos.length - 1 && (
        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-all"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === activeIndex ? 'bg-white scale-110' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
