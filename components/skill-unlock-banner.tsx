'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, ArrowRight, X, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const SESSION_KEY = 'cookquest_unlock_banner_dismissed';

interface UnlockedSkill {
  id: string;
  name: string;
}

interface SkillUnlockBannerProps {
  masteredSkillName: string;
  unlockedSkills: UnlockedSkill[];
  onDismiss: () => void;
  onExploreSkill: (skillId: string) => void;
}

export function SkillUnlockBanner({
  masteredSkillName,
  unlockedSkills,
  onDismiss,
  onExploreSkill,
}: SkillUnlockBannerProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    sessionStorage.setItem(SESSION_KEY, 'true');
    // Wait for exit animation before calling onDismiss
    setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 400);
  }, [onDismiss]);

  useEffect(() => {
    // Don't show if already dismissed in this session
    if (sessionStorage.getItem(SESSION_KEY) === 'true') {
      return;
    }
    // Trigger entrance animation on next frame
    requestAnimationFrame(() => setVisible(true));

    // Auto-dismiss after 10 seconds
    const timer = setTimeout(dismiss, 10000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  // Don't render if dismissed before mount
  if (!visible && !exiting) {
    // Check sessionStorage during first render
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === 'true') {
      return null;
    }
  }

  return (
    <div
      className={`transition-all duration-500 ease-out overflow-hidden ${
        visible && !exiting
          ? 'max-h-[400px] opacity-100 translate-y-0'
          : 'max-h-0 opacity-0 -translate-y-4'
      }`}
    >
      <Card className="relative overflow-hidden border-0 shadow-2xl">
        {/* Celebratory gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" />

        {/* Animated sparkle particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-yellow-200/40 animate-pulse"
              style={{
                width: 16 + Math.random() * 12,
                height: 16 + Math.random() * 12,
                left: `${10 + i * 15}%`,
                top: `${15 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${1.5 + Math.random()}s`,
              }}
            />
          ))}
        </div>

        <CardContent className="relative p-6 sm:p-8">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-col items-center text-center gap-4">
            {/* Trophy icon */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg animate-bounce">
              <Trophy className="size-8 text-yellow-200" />
            </div>

            {/* Headline */}
            <div>
              <p className="text-yellow-200 text-sm font-semibold uppercase tracking-wide mb-1">
                Skill Mastered!
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                You&apos;ve mastered {masteredSkillName}!
              </h3>
              <p className="text-white/85 mt-2 text-sm sm:text-base max-w-lg mx-auto">
                Your kitchen just got bigger. Explore {unlockedSkills.length} new skill track{unlockedSkills.length !== 1 ? 's' : ''}.
              </p>
            </div>

            {/* Unlocked skills pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {unlockedSkills.map((skill) => (
                <span
                  key={skill.id}
                  className="bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full"
                >
                  {skill.name}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Link href={`/skill/${unlockedSkills[0]?.id || 'heat-control'}`}>
                <Button
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold shadow-lg gap-2 text-base"
                  onClick={() => {
                    onExploreSkill(unlockedSkills[0]?.id || 'heat-control');
                    dismiss();
                  }}
                >
                  Explore {unlockedSkills[0]?.name || 'Heat Control'}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/15 font-medium"
                onClick={dismiss}
              >
                I&apos;ll explore later
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Check if the unlock banner should be shown.
 * Returns true if NOT yet dismissed in this session.
 */
export function shouldShowUnlockBanner(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_KEY) !== 'true';
}
