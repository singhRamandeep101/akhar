import type { ProgressState, QuizScore } from '../types'
import { curriculum, PASS_PERCENT, unitLessonKeys } from '../data/curriculum'

const STORAGE_KEY = 'punjabi-learn-progress-v1'

export function defaultProgress(): ProgressState {
  return {
    version: 1,
    completedLessons: [],
    drawingPassed: [],
    unlockedUnitIndex: 0,
    quizScores: [],
    weakItems: [],
    lastVisited: null,
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    const parsed = JSON.parse(raw) as ProgressState
    if (parsed.version !== 1) return defaultProgress()
    return {
      ...defaultProgress(),
      ...parsed,
      drawingPassed: Array.isArray(parsed.drawingPassed) ? parsed.drawingPassed : [],
    }
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(state: ProgressState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportProgress(state: ProgressState): string {
  return JSON.stringify(state, null, 2)
}

export function importProgress(json: string): ProgressState {
  const parsed = JSON.parse(json) as ProgressState
  if (parsed.version !== 1 || !Array.isArray(parsed.completedLessons)) {
    throw new Error('Invalid progress file')
  }
  const next = {
    ...defaultProgress(),
    ...parsed,
    drawingPassed: Array.isArray(parsed.drawingPassed) ? parsed.drawingPassed : [],
  }
  saveProgress(next)
  return next
}

export function markLessonComplete(state: ProgressState, lessonId: string): ProgressState {
  if (state.completedLessons.includes(lessonId)) {
    return { ...state, lastVisited: lessonId }
  }
  const next = {
    ...state,
    completedLessons: [...state.completedLessons, lessonId],
    lastVisited: lessonId,
  }
  saveProgress(next)
  return next
}

export function markDrawingPassed(state: ProgressState, lessonId: string): ProgressState {
  if (state.drawingPassed.includes(lessonId)) return state
  const next = {
    ...state,
    drawingPassed: [...state.drawingPassed, lessonId],
  }
  saveProgress(next)
  return next
}

export function hasDrawingPassed(state: ProgressState, lessonId: string): boolean {
  return state.drawingPassed.includes(lessonId)
}

export function recordQuiz(
  state: ProgressState,
  unitId: string,
  score: number,
  total: number,
  weakItems: string[],
): ProgressState {
  const percent = total === 0 ? 0 : Math.round((score / total) * 100)
  const passed = percent >= PASS_PERCENT
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)
  const prev = state.quizScores.find((q) => q.unitId === unitId)
  const entry: QuizScore = {
    unitId,
    score: !prev || percent >= prev.percent ? score : prev.score,
    total: !prev || percent >= prev.percent ? total : prev.total,
    percent: Math.max(percent, prev?.percent ?? 0),
    passed: Boolean(prev?.passed || passed),
    at: new Date().toISOString(),
  }
  const quizScores = [...state.quizScores.filter((q) => q.unitId !== unitId), entry]
  let unlockedUnitIndex = state.unlockedUnitIndex
  if (passed && unitIndex >= 0 && unlockedUnitIndex <= unitIndex) {
    unlockedUnitIndex =
      unitIndex >= curriculum.length - 1 ? curriculum.length : unitIndex + 1
  }
  const next: ProgressState = {
    ...state,
    quizScores,
    unlockedUnitIndex,
    weakItems: passed
      ? state.weakItems.filter((w) => !weakItems.includes(w))
      : Array.from(new Set([...state.weakItems, ...weakItems])),
  }
  saveProgress(next)
  return next
}

export function isUnitUnlocked(state: ProgressState, unitIndex: number): boolean {
  return unitIndex <= state.unlockedUnitIndex
}

export function isUnitLessonsDone(state: ProgressState, unitIndex: number): boolean {
  const unit = curriculum[unitIndex]
  if (!unit) return false
  const keys = unitLessonKeys(unit)
  return keys.every((k) => state.completedLessons.includes(k))
}

export function hasPassedQuiz(state: ProgressState, unitId: string): boolean {
  return state.quizScores.some((q) => q.unitId === unitId && q.passed)
}

export function overallPercent(state: ProgressState): number {
  const totalLessons = curriculum.reduce((n, u) => n + unitLessonKeys(u).length, 0)
  const totalQuizzes = curriculum.length
  const doneLessons = state.completedLessons.length
  const passedQuizzes = state.quizScores.filter((q) => q.passed).length
  const total = totalLessons + totalQuizzes
  if (total === 0) return 0
  return Math.round(((doneLessons + passedQuizzes) / total) * 100)
}

export function setLastVisited(state: ProgressState, path: string): ProgressState {
  const next = { ...state, lastVisited: path }
  saveProgress(next)
  return next
}
