import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface OnboardingState {
  hasSeenWelcome: boolean
  quizCompleted: boolean
  selectedLevel: 'beginner' | 'intermediate' | 'advanced' | null
  tutorialStep: number
  tutorialDismissed: boolean
}

export interface OnboardingActions {
  setHasSeenWelcome: () => void
  completeQuiz: (level: 'beginner' | 'intermediate' | 'advanced') => void
  setTutorialStep: (step: number) => void
  dismissTutorial: () => void
  resetOnboarding: () => void
}

export type OnboardingStore = OnboardingState & OnboardingActions

const initialState: OnboardingState = {
  hasSeenWelcome: false,
  quizCompleted: false,
  selectedLevel: null,
  tutorialStep: 0,
  tutorialDismissed: false,
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...initialState,

      setHasSeenWelcome: () => set({ hasSeenWelcome: true }),

      completeQuiz: (level) => set({ quizCompleted: true, selectedLevel: level }),

      setTutorialStep: (step) => set({ tutorialStep: step }),

      dismissTutorial: () => set({ tutorialDismissed: true }),

      resetOnboarding: () => set(initialState),
    }),
    {
      name: 'cookquest-onboarding',
    }
  )
)
