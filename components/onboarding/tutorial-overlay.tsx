'use client';

import { useState, useEffect, useCallback } from 'react';
import { MascotMessage } from './mascot-message';
import { Button } from '@/components/ui/button';
import type { MascotExpression } from './mascot';

interface TutorialStep {
  targetSelector: string;
  message: string;
  expression: MascotExpression;
}

const BEGINNER_STEPS: TutorialStep[] = [
  {
    targetSelector: '[data-tutorial="skills"]',
    message: 'Start here! Pick a skill path and work through recipes to level up.',
    expression: 'pointing',
  },
  {
    targetSelector: '[data-tutorial="recipes"]',
    message: 'Each recipe teaches you a new technique. Complete them to earn XP!',
    expression: 'happy',
  },
  {
    targetSelector: '[data-tutorial="indian-plan"]',
    message: 'Follow our structured Indian cooking plan to learn a whole cuisine!',
    expression: 'celebrating',
  },
  {
    targetSelector: '[data-tutorial="feed"]',
    message: 'Follow other cooks to see their progress and get inspired!',
    expression: 'waving',
  },
  {
    targetSelector: '[data-tutorial="people"]',
    message: 'Build your cooking community! Find friends and learn together.',
    expression: 'happy',
  },
];

const INTERMEDIATE_STEPS: TutorialStep[] = [
  BEGINNER_STEPS[0], // Skills
  BEGINNER_STEPS[2], // Indian Plan
  BEGINNER_STEPS[3], // Feed/People combined
];

const ADVANCED_STEPS: TutorialStep[] = [
  BEGINNER_STEPS[2], // Indian Plan
  BEGINNER_STEPS[3], // Feed/People combined
];

function getSteps(level: string): TutorialStep[] {
  switch (level) {
    case 'advanced':
      return ADVANCED_STEPS;
    case 'intermediate':
      return INTERMEDIATE_STEPS;
    default:
      return BEGINNER_STEPS;
  }
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TutorialOverlayProps {
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ userLevel, onComplete, onSkip }: TutorialOverlayProps) {
  const steps = getSteps(userLevel);
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);

  const updateSpotlight = useCallback(() => {
    const step = steps[currentStep];
    if (!step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlight({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    } else {
      setSpotlight(null);
    }
  }, [currentStep, steps]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onSkip} />

      {/* Spotlight cutout */}
      {spotlight && (
        <div
          className="absolute rounded-xl border-2 border-primary/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      {/* Tutorial card */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm"
        style={{
          top: spotlight
            ? spotlight.top + spotlight.height + 16
            : '50%',
          ...(spotlight ? {} : { transform: 'translate(-50%, -50%)' }),
        }}
      >
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xl">
          <MascotMessage
            message={step.message}
            expression={step.expression}
            size="sm"
          />

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="text-muted-foreground"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-primary text-primary-foreground hover:bg-cq-primary-hover"
              >
                {isLast ? 'Done' : 'Next'}
              </Button>
            </div>
          </div>

          {/* Step dots */}
          <div className="mt-3 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStep ? 'w-4 bg-primary' : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
