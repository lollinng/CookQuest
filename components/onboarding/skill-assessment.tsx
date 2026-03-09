'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Mascot } from './mascot';

type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

interface SkillAssessmentProps {
  onComplete: (level: SkillLevel) => void;
}

const LEVELS: { value: SkillLevel; emoji: string; label: string; description: string }[] = [
  { value: 'beginner', emoji: '🌱', label: 'Beginner', description: "I'm new to cooking" },
  { value: 'intermediate', emoji: '🍳', label: 'Intermediate', description: 'I cook sometimes' },
  { value: 'advanced', emoji: '👨‍🍳', label: 'Advanced', description: 'I cook regularly' },
];

const QUIZ_QUESTIONS: { question: string; options: { label: string; score: number }[] }[] = [
  {
    question: 'How comfortable are you with a knife?',
    options: [
      { label: 'I mostly avoid knives', score: 0 },
      { label: 'I can chop basic things', score: 1 },
      { label: 'I can dice, julienne, and mince', score: 2 },
    ],
  },
  {
    question: 'How often do you cook?',
    options: [
      { label: 'Rarely or never', score: 0 },
      { label: 'A few times a week', score: 1 },
      { label: 'Almost every day', score: 2 },
    ],
  },
  {
    question: 'Can you cook rice without burning it?',
    options: [
      { label: "I've burned it more than once", score: 0 },
      { label: 'Usually turns out okay', score: 1 },
      { label: 'Perfect every time', score: 2 },
    ],
  },
  {
    question: 'How well do you know your spices?',
    options: [
      { label: 'Salt and pepper is about it', score: 0 },
      { label: 'I know maybe 5-10 spices', score: 1 },
      { label: 'I can blend my own spice mixes', score: 2 },
    ],
  },
  {
    question: "What's the most complex dish you've made?",
    options: [
      { label: 'Scrambled eggs or instant noodles', score: 0 },
      { label: 'A full recipe like pasta or stir-fry', score: 1 },
      { label: 'Multi-component meals or baked goods', score: 2 },
    ],
  },
];

function scoreToLevel(score: number): SkillLevel {
  if (score <= 3) return 'beginner';
  if (score <= 6) return 'intermediate';
  return 'advanced';
}

export function SkillAssessment({ onComplete }: SkillAssessmentProps) {
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<(number | null)[]>(
    new Array(QUIZ_QUESTIONS.length).fill(null)
  );
  const [quizResult, setQuizResult] = useState<SkillLevel | null>(null);

  const handleDirectPick = () => {
    if (selectedLevel) {
      onComplete(selectedLevel);
    }
  };

  const handleQuizAnswer = (questionIdx: number, score: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIdx] = score;
    setQuizAnswers(newAnswers);
  };

  const handleQuizSubmit = () => {
    const totalScore = quizAnswers.reduce<number>((sum, s) => sum + (s ?? 0), 0);
    const level = scoreToLevel(totalScore);
    setQuizResult(level);
  };

  const allQuizAnswered = quizAnswers.every((a) => a !== null);

  return (
    <div className="space-y-6">
      {/* Section 1: Direct Level Picker */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">
          What's your cooking level?
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => {
                setSelectedLevel(level.value);
                setQuizResult(null);
              }}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                selectedLevel === level.value && !quizResult
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <span className="text-2xl">{level.emoji}</span>
              <p className="mt-1 font-medium text-foreground">{level.label}</p>
              <p className="text-sm text-muted-foreground">{level.description}</p>
            </button>
          ))}
        </div>
        {selectedLevel && !showQuiz && !quizResult && (
          <button
            onClick={handleDirectPick}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-cq-primary-hover"
          >
            Continue as {LEVELS.find((l) => l.value === selectedLevel)?.label}
          </button>
        )}
      </div>

      {/* Section 2: Quiz Toggle */}
      {!quizResult && (
        <button
          onClick={() => setShowQuiz(!showQuiz)}
          className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {showQuiz ? 'Hide quiz' : "Not sure? Take a quick quiz"}
        </button>
      )}

      {/* Quiz Questions */}
      {showQuiz && !quizResult && (
        <div className="space-y-5 rounded-xl border border-border bg-card p-4">
          {QUIZ_QUESTIONS.map((q, qIdx) => (
            <div key={qIdx}>
              <p className="mb-2 text-sm font-medium text-foreground">
                {qIdx + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleQuizAnswer(qIdx, opt.score)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-left text-sm transition-all',
                      quizAnswers[qIdx] === opt.score
                        ? 'border-amber-500 bg-amber-500/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={handleQuizSubmit}
            disabled={!allQuizAnswered}
            className={cn(
              'w-full rounded-lg px-4 py-2.5 font-medium transition-colors',
              allQuizAnswered
                ? 'bg-primary text-primary-foreground hover:bg-cq-primary-hover'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            )}
          >
            See My Result
          </button>
        </div>
      )}

      {/* Quiz Result */}
      {quizResult && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-center">
          <Mascot expression="celebrating" size="lg" className="mx-auto" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            You're a {quizResult.charAt(0).toUpperCase() + quizResult.slice(1)}!
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {quizResult === 'beginner' && "Great place to start! We'll guide you every step."}
            {quizResult === 'intermediate' && "Nice skills! Time to level up your cooking game."}
            {quizResult === 'advanced' && "Impressive! Ready for some serious challenges."}
          </p>
          <button
            onClick={() => onComplete(quizResult)}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-cq-primary-hover"
          >
            Continue as {quizResult.charAt(0).toUpperCase() + quizResult.slice(1)}
          </button>
        </div>
      )}
    </div>
  );
}
