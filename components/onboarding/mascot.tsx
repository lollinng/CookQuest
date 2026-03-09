'use client';

import { cn } from '@/lib/utils';

export type MascotExpression = 'happy' | 'thinking' | 'pointing' | 'celebrating' | 'waving';
export type MascotSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<MascotSize, number> = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 180,
};

interface MascotProps {
  expression?: MascotExpression;
  size?: MascotSize;
  className?: string;
}

// Eye shapes per expression
function Eyes({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'thinking':
      return (
        <>
          {/* Left eye looking up */}
          <ellipse cx="38" cy="53" rx="4" ry="5" fill="#1F2937" />
          <circle cx="37" cy="51" r="1.5" fill="white" />
          {/* Right eye squinting */}
          <path d="M58 51 Q62 53 66 51" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
    case 'celebrating':
      return (
        <>
          {/* Happy closed eyes (arcs) */}
          <path d="M34 53 Q38 48 42 53" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M58 53 Q62 48 66 53" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      );
    case 'waving':
    case 'pointing':
    case 'happy':
    default:
      return (
        <>
          {/* Left eye */}
          <ellipse cx="38" cy="53" rx="4" ry="5" fill="#1F2937" />
          <circle cx="36.5" cy="51.5" r="1.5" fill="white" />
          {/* Right eye */}
          <ellipse cx="62" cy="53" rx="4" ry="5" fill="#1F2937" />
          <circle cx="60.5" cy="51.5" r="1.5" fill="white" />
        </>
      );
  }
}

// Mouth per expression
function Mouth({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'thinking':
      return <circle cx="50" cy="67" r="3" fill="#1F2937" />;
    case 'celebrating':
      return (
        <path d="M40 64 Q50 75 60 64" stroke="#1F2937" strokeWidth="2" fill="#EF4444" strokeLinecap="round" />
      );
    case 'happy':
    case 'waving':
    case 'pointing':
    default:
      return (
        <path d="M42 64 Q50 72 58 64" stroke="#1F2937" strokeWidth="2" fill="none" strokeLinecap="round" />
      );
  }
}

// Arms per expression
function Arms({ expression }: { expression: MascotExpression }) {
  switch (expression) {
    case 'waving':
      return (
        <>
          {/* Left arm down */}
          <path d="M28 80 Q20 90 18 95" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Right arm waving (animated via CSS) */}
          <g className="origin-[72px_80px] animate-mascot-wave">
            <path d="M72 80 Q80 68 85 58" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Hand */}
            <circle cx="85" cy="56" r="4" fill="#FBBF24" />
          </g>
        </>
      );
    case 'pointing':
      return (
        <>
          {/* Left arm down */}
          <path d="M28 80 Q20 90 18 95" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Right arm pointing right */}
          <path d="M72 80 Q82 78 90 75" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M90 75 L96 73" stroke="#FBBF24" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case 'celebrating':
      return (
        <>
          {/* Both arms up */}
          <path d="M28 80 Q18 65 15 55" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="14" cy="53" r="4" fill="#FBBF24" />
          <path d="M72 80 Q82 65 85 55" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="86" cy="53" r="4" fill="#FBBF24" />
        </>
      );
    case 'thinking':
      return (
        <>
          {/* Left arm down */}
          <path d="M28 80 Q20 90 18 95" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          {/* Right hand on chin */}
          <path d="M72 80 Q75 72 68 68" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="67" cy="66" r="3.5" fill="#FBBF24" />
        </>
      );
    default:
      return (
        <>
          <path d="M28 80 Q20 90 18 95" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M72 80 Q80 90 82 95" stroke="#FBBF24" strokeWidth="5" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

export function Mascot({ expression = 'happy', size = 'md', className }: MascotProps) {
  const px = SIZE_MAP[size];

  return (
    <div
      className={cn('animate-mascot-bob inline-flex shrink-0', className)}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`Tadka the chef mascot, ${expression}`}
    >
      <svg viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        {/* Chef hat (toque) */}
        <ellipse cx="50" cy="22" rx="22" ry="18" fill="white" />
        <rect x="35" y="22" width="30" height="14" rx="2" fill="white" />
        <rect x="35" y="32" width="30" height="4" rx="1" fill="#F9A8D4" opacity="0.3" />

        {/* Head */}
        <circle cx="50" cy="55" r="24" fill="#FBBF24" />

        {/* Rosy cheeks */}
        <circle cx="32" cy="60" r="5" fill="#F9A8D4" opacity="0.5" />
        <circle cx="68" cy="60" r="5" fill="#F9A8D4" opacity="0.5" />

        {/* Eyes */}
        <Eyes expression={expression} />

        {/* Eyebrows */}
        {expression === 'thinking' ? (
          <>
            <path d="M33 46 Q38 43 43 46" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M57 44 Q62 41 67 44" stroke="#92400E" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d="M33 47 Q38 44 43 47" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M57 47 Q62 44 67 47" stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Mouth */}
        <Mouth expression={expression} />

        {/* Body / Apron */}
        <path d="M35 78 Q50 82 65 78 L68 100 Q50 104 32 100 Z" fill="white" />
        {/* Apron trim */}
        <path d="M37 80 Q50 84 63 80" stroke="#F97316" strokeWidth="1.5" fill="none" />
        {/* Apron pocket */}
        <rect x="44" y="88" width="12" height="8" rx="2" fill="none" stroke="#F97316" strokeWidth="1" opacity="0.6" />

        {/* Arms */}
        <Arms expression={expression} />
      </svg>
    </div>
  );
}
