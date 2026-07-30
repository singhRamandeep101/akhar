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
  defaultProgress,
  importProgress,
  loadProgress,
  markDrawingPassed,
  markLessonComplete,
  recordQuiz,
  saveProgress,
  setLastVisited,
} from './progress'

type ProgressContextValue = {
  progress: ProgressState
  completeLesson: (lessonId: string) => void
  passDrawing: (lessonId: string) => void
  finishQuiz: (unitId: string, score: number, total: number, weakItems: string[]) => void
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

  const finishQuiz = useCallback((unitId: string, score: number, total: number, weakItems: string[]) => {
    setProgress((p) => recordQuiz(p, unitId, score, total, weakItems))
  }, [])

  const visit = useCallback((path: string) => {
    setProgress((p) => setLastVisited(p, path))
  }, [])

  const resetAll = useCallback(() => {
    const next = defaultProgress()
    saveProgress(next)
    setProgress(next)
  }, [])

  const exportJson = useCallback(() => JSON.stringify(progress, null, 2), [progress])

  const importJson = useCallback((json: string) => {
    setProgress(importProgress(json))
  }, [])

  const value = useMemo(
    () => ({
      progress,
      completeLesson,
      passDrawing,
      finishQuiz,
      visit,
      resetAll,
      exportJson,
      importJson,
    }),
    [progress, completeLesson, passDrawing, finishQuiz, visit, resetAll, exportJson, importJson],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
