'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Mascot } from '@/components/onboarding/mascot';
import { SkillAssessment } from '@/components/onboarding/skill-assessment';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';
import { useSubmitSkillLevel, useCompleteOnboarding } from '@/hooks/use-onboarding';
import { useAuth } from '@/lib/auth-context';

type Stage = 'welcome' | 'assessment' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('welcome');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const { setHasSeenWelcome, completeQuiz } = useOnboardingStore();
  const { isAuthenticated } = useAuth();
  const submitSkillLevel = useSubmitSkillLevel();
  const completeOnboarding = useCompleteOnboarding();

  const handleGetStarted = () => {
    setStage('assessment');
  };

  const handleSkip = () => {
    setHasSeenWelcome();
    router.push('/');
  };

  const handleAssessmentComplete = async (level: 'beginner' | 'intermediate' | 'advanced') => {
    setSelectedLevel(level);
    completeQuiz(level);

    // Sync to backend if authenticated
    if (isAuthenticated) {
      try {
        await submitSkillLevel.mutateAsync(level);
      } catch {
        // localStorage already saved, non-critical
      }
    }

    setStage('done');
  };

  const handleFinish = async () => {
    setHasSeenWelcome();

    if (isAuthenticated) {
      try {
        await completeOnboarding.mutateAsync();
      } catch {
        // localStorage already saved, non-critical
      }
    }

    router.push('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Stage 1: Welcome */}
        {stage === 'welcome' && (
          <div className="animate-slide-up-spring text-center">
            <Mascot expression="waving" size="xl" className="mx-auto" />

            <h1 className="mt-6 text-3xl font-bold text-foreground">
              Welcome to CookQuest!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your gamified journey to becoming a better cook starts here.
            </p>

            <div className="mt-8 space-y-3">
              <Button
                onClick={handleGetStarted}
                className="w-full gap-2 bg-primary text-primary-foreground hover:bg-cq-primary-hover"
                size="lg"
              >
                Get Started
                <ArrowRight className="size-4" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Skip for now
              </button>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl">🎯</div>
                <p className="mt-1 text-xs text-muted-foreground">Skill Paths</p>
              </div>
              <div>
                <div className="text-2xl">🔥</div>
                <p className="mt-1 text-xs text-muted-foreground">Daily Streaks</p>
              </div>
              <div>
                <div className="text-2xl">🏆</div>
                <p className="mt-1 text-xs text-muted-foreground">Achievements</p>
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Assessment */}
        {stage === 'assessment' && (
          <div className="animate-slide-up-spring">
            <div className="mb-6 flex items-center gap-3">
              <Mascot expression="thinking" size="sm" />
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  Let's find your level
                </h2>
                <p className="text-sm text-muted-foreground">
                  This helps us personalize your experience
                </p>
              </div>
            </div>

            <SkillAssessment onComplete={handleAssessmentComplete} />
          </div>
        )}

        {/* Stage 3: Done */}
        {stage === 'done' && (
          <div className="animate-slide-up-spring text-center">
            <Mascot expression="celebrating" size="xl" className="mx-auto" />

            <h2 className="mt-6 text-2xl font-bold text-foreground">
              You're all set!
            </h2>
            <p className="mt-2 text-muted-foreground">
              {selectedLevel === 'beginner' &&
                "We'll start you with the basics and build from there. Every chef starts somewhere!"}
              {selectedLevel === 'intermediate' &&
                "Nice — we'll skip the absolute basics and dive into recipes that challenge you."}
              {selectedLevel === 'advanced' &&
                "Impressive! Get ready for complex techniques and ambitious recipes."}
            </p>

            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-center justify-center gap-2 text-amber-400">
                <Sparkles className="size-5" />
                <span className="font-medium">Your first quest awaits</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete your first recipe to start your cooking streak
              </p>
            </div>

            <Button
              onClick={handleFinish}
              className="mt-6 w-full gap-2 bg-primary text-primary-foreground hover:bg-cq-primary-hover"
              size="lg"
            >
              <ChefHat className="size-4" />
              Go to Dashboard
            </Button>
          </div>
        )}

        {/* Progress dots */}
        <div className="mt-8 flex justify-center gap-2">
          {(['welcome', 'assessment', 'done'] as Stage[]).map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === stage ? 'w-6 bg-primary' : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
