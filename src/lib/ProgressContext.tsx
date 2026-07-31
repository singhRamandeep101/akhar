import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ProgressState } from '../types'
import {
  completeOnboarding,
  defaultProgress,
  exportProgress,
  importProgress,
  loadProgress,
  markDrawingPassed,
  markLessonComplete,
  recordQuiz,
  recordReviewResult,
  saveProgress,
  setLastVisited,
} from './progress'

type ProgressContextValue = {
  progress: ProgressState
  completeLesson: (lessonId: string) => void
  passDrawing: (lessonId: string) => void
  finishQuiz: (
    unitId: string,
    score: number,
    total: number,
    weakItems: string[],
    correctItems?: string[],
  ) => void
  reviewItem: (itemId: string, good: boolean) => void
  finishOnboarding: () => void
  visit: (path: string) => void
  resetAll: () => void
  exportJson: () => string
  importJson: (json: string) => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())

  const completeLesson = useCallback((lessonId: string) => {
    setProgress((p) => markLessonComplete(p, lessonId))
  }, [])

  const passDrawing = useCallback((lessonId: string) => {
    setProgress((p) => markDrawingPassed(p, lessonId))
  }, [])

  const finishQuiz = useCallback(
    (unitId: string, score: number, total: number, weakItems: string[], correctItems: string[] = []) => {
      setProgress((p) => recordQuiz(p, unitId, score, total, weakItems, correctItems))
    },
    [],
  )

  const reviewItem = useCallback((itemId: string, good: boolean) => {
    setProgress((p) => recordReviewResult(p, itemId, good))
  }, [])

  const finishOnboarding = useCallback(() => {
    setProgress((p) => completeOnboarding(p))
  }, [])

  const visit = useCallback((path: string) => {
    setProgress((p) => setLastVisited(p, path))
  }, [])

  const resetAll = useCallback(() => {
    const next = defaultProgress()
    saveProgress(next)
    setProgress(next)
  }, [])

  const exportJson = useCallback(() => exportProgress(progress), [progress])

  const importJson = useCallback((json: string) => {
    setProgress(importProgress(json))
  }, [])

  const value = useMemo(
    () => ({
      progress,
      completeLesson,
      passDrawing,
      finishQuiz,
      reviewItem,
      finishOnboarding,
      visit,
      resetAll,
      exportJson,
      importJson,
    }),
    [
      progress,
      completeLesson,
      passDrawing,
      finishQuiz,
      reviewItem,
      finishOnboarding,
      visit,
      resetAll,
      exportJson,
      importJson,
    ],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
