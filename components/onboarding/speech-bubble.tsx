'use client';

import { cn } from '@/lib/utils';

interface SpeechBubbleProps {
  children: React.ReactNode;
  position?: 'right' | 'bottom';
  className?: string;
}

export function SpeechBubble({ children, position = 'right', className }: SpeechBubbleProps) {
  return (
    <div className={cn('relative', className)}>
      <div className="rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 shadow-lg">
        {children}
      </div>
      {/* Triangle pointer */}
      {position === 'right' && (
        <div
          className="absolute top-4 -left-2 h-0 w-0"
          style={{
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '8px solid white',
          }}
        />
      )}
      {position === 'bottom' && (
        <div
          className="absolute -top-2 left-6 h-0 w-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: '8px solid white',
          }}
        />
      )}
    </div>
  );
}
