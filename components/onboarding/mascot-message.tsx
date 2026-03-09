'use client';

import { cn } from '@/lib/utils';
import { Mascot, MascotExpression, MascotSize } from './mascot';
import { SpeechBubble } from './speech-bubble';

interface MascotMessageProps {
  message: string;
  expression?: MascotExpression;
  size?: MascotSize;
  action?: React.ReactNode;
  className?: string;
}

export function MascotMessage({
  message,
  expression = 'happy',
  size = 'md',
  action,
  className,
}: MascotMessageProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <Mascot expression={expression} size={size} />
      <SpeechBubble position="right" className="flex-1">
        <p>{message}</p>
        {action && <div className="mt-2">{action}</div>}
      </SpeechBubble>
    </div>
  );
}
