'use client';

import { Sparkles, ChefHat } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LevelUpModalProps {
  open: boolean;
  onClose: () => void;
  newLevel: number;
  totalXp: number;
  xpToNextLevel: number;
}

function getLevelTitle(level: number): string {
  if (level <= 3) return 'Beginner';
  if (level <= 5) return 'Home Cook';
  if (level <= 7) return 'Intermediate';
  if (level <= 9) return 'Advanced';
  return 'Master Chef';
}

export function LevelUpModal({
  open,
  onClose,
  newLevel,
  totalXp,
  xpToNextLevel,
}: LevelUpModalProps) {
  const title = getLevelTitle(newLevel);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl overflow-hidden p-0 bg-cq-surface">
        {/* Gradient header */}
        <div className="relative bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 px-6 pt-8 pb-10">
          {/* Sparkle particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-yellow-200/50 animate-pulse"
                style={{
                  width: 14 + Math.random() * 10,
                  height: 14 + Math.random() * 10,
                  left: `${8 + i * 12}%`,
                  top: `${10 + (i % 4) * 20}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${1.2 + Math.random() * 0.8}s`,
                }}
              />
            ))}
          </div>

          <DialogHeader className="relative text-center space-y-3">
            <div className="mx-auto w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg animate-bounce">
              <span className="text-4xl font-black text-white">{newLevel}</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-white">
              Level {newLevel}! You&apos;re leveling up!
            </DialogTitle>
            <DialogDescription className="text-white/90 text-base">
              You&apos;re now a {title}. Keep cooking to reach new heights!
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Stats section */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-cq-text-muted flex items-center gap-1.5">
              <ChefHat className="size-4" />
              Total XP earned
            </span>
            <span className="font-bold text-cq-primary">{totalXp.toLocaleString()} XP</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cq-text-muted">Next level</span>
              <span className="text-cq-text-muted">0 / {xpToNextLevel.toLocaleString()} XP</span>
            </div>
            <div className="h-2 rounded-full bg-cq-track overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 w-0" />
            </div>
          </div>

          <Button
            onClick={onClose}
            size="lg"
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg"
          >
            Keep Cooking!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
