'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Mascot } from './mascot';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSkip: () => void;
}

const FEATURES = [
  { emoji: '🎯', title: 'Skill Paths', desc: 'Master cooking one step at a time' },
  { emoji: '🔥', title: 'Daily Streaks', desc: 'Build consistency with daily goals' },
  { emoji: '🏆', title: 'Achievements', desc: 'Earn XP and unlock new skills' },
];

const FLOATING_EMOJIS = ['🍳', '🥘', '🍕', '🌶️', '🥑', '🍲', '🧄', '🍋'];

export function WelcomeScreen({ onGetStarted, onSkip }: WelcomeScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-background to-background" />

      {/* Floating food emojis */}
      {FLOATING_EMOJIS.map((emoji, i) => (
        <span
          key={i}
          className="pointer-events-none absolute animate-mascot-bob text-2xl opacity-20"
          style={{
            left: `${10 + (i * 12) % 80}%`,
            top: `${5 + (i * 17) % 70}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        >
          {emoji}
        </span>
      ))}

      {/* Content */}
      <div className="relative z-10 w-full max-w-md text-center">
        <Mascot expression="waving" size="xl" className="mx-auto" />

        <h1 className="mt-6 text-4xl font-bold text-foreground">
          Welcome to CookQuest!
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Your gamified cooking adventure starts here
        </p>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card/50 p-3 backdrop-blur-sm"
            >
              <div className="text-3xl">{f.emoji}</div>
              <p className="mt-1 text-sm font-medium text-foreground">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-8 space-y-3">
          <Button
            onClick={onGetStarted}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-cq-primary-hover"
            size="lg"
          >
            Let's Get Started
            <ArrowRight className="size-4" />
          </Button>
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
          >
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}
