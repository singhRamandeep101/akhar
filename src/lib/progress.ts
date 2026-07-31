import type { DailyGoalState, MemoryCard, ProgressState, QuizScore, StreakState, StrengthLevel } from '../types'
import { curriculum, PASS_PERCENT, unitLessonKeys } from '../data/curriculum'

const STORAGE_KEY = 'punjabi-learn-progress-v1'

const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]

export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`)
  d.setDate(d.getDate() + days)
  return todayKey(d)
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()
  return Math.round(ms / 86400000)
}

export function defaultProgress(): ProgressState {
  return {
    version: 1,
    completedLessons: [],
    drawingPassed: [],
    unlockedUnitIndex: 0,
    quizScores: [],
    weakItems: [],
    lastVisited: null,
    streak: { current: 0, best: 0, lastActiveDate: null },
    memory: {},
    dailyGoal: { date: todayKey(), target: 5, completed: 0 },
    onboardingDone: false,
  }
}

function normalize(raw: Partial<ProgressState>): ProgressState {
  const base = defaultProgress()
  const maxUnlock = curriculum.length
  const unlocked = typeof raw.unlockedUnitIndex === 'number' && Number.isFinite(raw.unlockedUnitIndex)
    ? Math.max(0, Math.min(maxUnlock, Math.floor(raw.unlockedUnitIndex)))
    : base.unlockedUnitIndex
  const completedLessons = Array.isArray(raw.completedLessons)
    ? [...new Set(raw.completedLessons.filter((k): k is string => typeof k === 'string'))]
    : []
  const drawingPassed = Array.isArray(raw.drawingPassed)
    ? [...new Set(raw.drawingPassed.filter((k): k is string => typeof k === 'string'))]
    : []
  const weakItems = Array.isArray(raw.weakItems)
    ? [...new Set(raw.weakItems.filter((k): k is string => typeof k === 'string'))]
    : []
  const quizScores = Array.isArray(raw.quizScores)
    ? raw.quizScores.filter((q): q is QuizScore => !!q && typeof q === 'object' && typeof q.unitId === 'string')
    : []
  const streakRaw = (raw.streak && typeof raw.streak === 'object' ? raw.streak : {}) as Partial<StreakState>
  const dailyRaw = (raw.dailyGoal && typeof raw.dailyGoal === 'object' ? raw.dailyGoal : {}) as Partial<DailyGoalState>
  return {
    ...base,
    version: 1,
    completedLessons,
    drawingPassed,
    unlockedUnitIndex: unlocked,
    quizScores,
    weakItems,
    lastVisited: typeof raw.lastVisited === 'string' ? raw.lastVisited : null,
    streak: {
      current: Math.max(0, Number(streakRaw.current) || 0),
      best: Math.max(0, Number(streakRaw.best) || 0),
      lastActiveDate: typeof streakRaw.lastActiveDate === 'string' ? streakRaw.lastActiveDate : null,
    },
    memory: raw.memory && typeof raw.memory === 'object' && !Array.isArray(raw.memory) ? raw.memory : {},
    dailyGoal: {
      date: typeof dailyRaw.date === 'string' ? dailyRaw.date : base.dailyGoal.date,
      target: Math.max(1, Math.min(50, Number(dailyRaw.target) || 5)),
      completed: Math.max(0, Number(dailyRaw.completed) || 0),
    },
    onboardingDone: Boolean(raw.onboardingDone),
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress()
    return normalize(JSON.parse(raw) as Partial<ProgressState>)
  } catch {
    return defaultProgress()
  }
}

export function saveProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota / private mode — keep in-memory state only */
  }
}

export function exportProgress(state: ProgressState): string {
  return JSON.stringify(state, null, 2)
}

export function importProgress(json: string): ProgressState {
  const parsed = JSON.parse(json) as Partial<ProgressState>
  if (!Array.isArray(parsed.completedLessons)) throw new Error('Invalid progress file')
  const next = normalize(parsed)
  saveProgress(next)
  return next
}

function bumpStreak(streak: StreakState, date = todayKey()): StreakState {
  if (streak.lastActiveDate === date) return streak
  const yesterday = addDays(date, -1)
  const current = streak.lastActiveDate === yesterday ? streak.current + 1 : 1
  return {
    current,
    best: Math.max(streak.best, current),
    lastActiveDate: date,
  }
}

function bumpDailyGoal(goal: DailyGoalState, amount = 1, date = todayKey()): DailyGoalState {
  if (goal.date !== date) return { date, target: goal.target || 5, completed: amount }
  return { ...goal, completed: goal.completed + amount }
}

function scheduleMemory(
  memory: Record<string, MemoryCard>,
  itemId: string,
  good: boolean,
  date = todayKey(),
): Record<string, MemoryCard> {
  const prev = memory[itemId]
  const box = good ? Math.min(5, (prev?.box ?? 0) + 1) : 0
  const card: MemoryCard = {
    itemId,
    box,
    dueAt: addDays(date, INTERVAL_DAYS[box] ?? 1),
    lastResult: good ? 'good' : 'again',
    seenAt: date,
  }
  return { ...memory, [itemId]: card }
}

export function markLessonComplete(state: ProgressState, lessonId: string): ProgressState {
  const itemId = lessonId.includes(':') ? lessonId.split(':')[1]! : lessonId
  const already = state.completedLessons.includes(lessonId)
  if (already) {
    const next: ProgressState = {
      ...state,
      streak: bumpStreak(state.streak),
    }
    saveProgress(next)
    return next
  }
  const next: ProgressState = {
    ...state,
    completedLessons: [...state.completedLessons, lessonId],
    streak: bumpStreak(state.streak),
    dailyGoal: bumpDailyGoal(state.dailyGoal),
    memory: scheduleMemory(state.memory, itemId, true),
  }
  saveProgress(next)
  return next
}

export function markDrawingPassed(state: ProgressState, lessonId: string): ProgressState {
  if (state.drawingPassed.includes(lessonId)) return state
  const next = {
    ...state,
    drawingPassed: [...state.drawingPassed, lessonId],
    streak: bumpStreak(state.streak),
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
  correctItems: string[] = [],
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
    unlockedUnitIndex = unitIndex >= curriculum.length - 1 ? curriculum.length : unitIndex + 1
  }

  let memory = { ...state.memory }
  // Misses win over hits when the same item appears in both lists
  const weakSet = new Set(weakItems)
  const correctOnly = correctItems.filter((id) => !weakSet.has(id))
  for (const id of correctOnly) memory = scheduleMemory(memory, id, true)
  for (const id of weakItems) memory = scheduleMemory(memory, id, false)

  // Drop what you got right; keep / add what you missed (pass or fail)
  const nextWeak = Array.from(
    new Set([...state.weakItems.filter((w) => !correctOnly.includes(w)), ...weakItems]),
  )

  const next: ProgressState = {
    ...state,
    quizScores,
    unlockedUnitIndex,
    weakItems: nextWeak,
    streak: bumpStreak(state.streak),
    dailyGoal: bumpDailyGoal(state.dailyGoal, Math.max(1, Math.round(total / 4))),
    memory,
  }
  saveProgress(next)
  return next
}

export function recordReviewResult(state: ProgressState, itemId: string, good: boolean): ProgressState {
  const next: ProgressState = {
    ...state,
    streak: bumpStreak(state.streak),
    dailyGoal: bumpDailyGoal(state.dailyGoal),
    memory: scheduleMemory(state.memory, itemId, good),
    weakItems: good ? state.weakItems.filter((w) => w !== itemId) : Array.from(new Set([...state.weakItems, itemId])),
  }
  saveProgress(next)
  return next
}

export function completeOnboarding(state: ProgressState): ProgressState {
  const next = { ...state, onboardingDone: true }
  saveProgress(next)
  return next
}

export function isUnitUnlocked(state: ProgressState, unitIndex: number): boolean {
  return unitIndex <= state.unlockedUnitIndex
}

export function isUnitLessonsDone(state: ProgressState, unitIndex: number): boolean {
  const unit = curriculum[unitIndex]
  if (!unit) return false
  return unitLessonKeys(unit).every((k) => state.completedLessons.includes(k))
}

export function hasPassedQuiz(state: ProgressState, unitId: string): boolean {
  return state.quizScores.some((q) => q.unitId === unitId && q.passed)
}

export function quizBest(state: ProgressState, unitId: string): number | null {
  const q = state.quizScores.find((x) => x.unitId === unitId)
  return q ? q.percent : null
}

export function overallPercent(state: ProgressState): number {
  const allKeys = new Set(curriculum.flatMap((u) => unitLessonKeys(u)))
  const totalLessons = allKeys.size
  const totalQuizzes = curriculum.length
  const doneLessons = state.completedLessons.filter((k) => allKeys.has(k)).length
  const passedQuizzes = state.quizScores.filter((q) => q.passed).length
  const total = totalLessons + totalQuizzes
  if (total === 0) return 0
  return Math.min(100, Math.round(((doneLessons + passedQuizzes) / total) * 100))
}

export function setLastVisited(state: ProgressState, path: string): ProgressState {
  if (state.lastVisited === path) return state
  const next = { ...state, lastVisited: path }
  saveProgress(next)
  return next
}

export function getDueItems(state: ProgressState, limit = 12): MemoryCard[] {
  const today = todayKey()
  const due = Object.values(state.memory).filter((c) => c.dueAt <= today)
  // Also surface weak items that aren't scheduled yet
  for (const id of state.weakItems) {
    if (!due.some((c) => c.itemId === id)) {
      due.push({
        itemId: id,
        box: 0,
        dueAt: today,
        lastResult: 'again',
        seenAt: today,
      })
    }
  }
  return due.sort((a, b) => a.box - b.box || a.dueAt.localeCompare(b.dueAt)).slice(0, limit)
}

export function strengthFor(state: ProgressState, itemId: string): StrengthLevel {
  const card = state.memory[itemId]
  if (!card) return 'cold'
  const lag = daysBetween(card.seenAt, todayKey())
  if (card.box >= 4 && lag <= 7) return 'strong'
  if (card.box >= 2 && lag <= INTERVAL_DAYS[card.box]) return 'fresh'
  if (card.dueAt <= todayKey() || lag > (INTERVAL_DAYS[card.box] ?? 3)) return 'fading'
  return 'fresh'
}

export function unitStrengthSummary(state: ProgressState, itemIds: string[]): StrengthLevel {
  if (!itemIds.length) return 'cold'
  const ranks: Record<StrengthLevel, number> = { cold: 0, fading: 1, fresh: 2, strong: 3 }
  let sum = 0
  for (const id of itemIds) sum += ranks[strengthFor(state, id)]
  const avg = sum / itemIds.length
  if (avg < 0.75) return 'cold'
  if (avg < 1.5) return 'fading'
  if (avg < 2.5) return 'fresh'
  return 'strong'
}

export function syncedDailyGoal(state: ProgressState): DailyGoalState {
  const today = todayKey()
  if (state.dailyGoal.date === today) return state.dailyGoal
  return { date: today, target: state.dailyGoal.target || 5, completed: 0 }
}

/** Streak as shown in UI — resets to 0 if the user missed a day (without waiting for next activity). */
export function syncedStreak(state: ProgressState): StreakState {
  const today = todayKey()
  const { streak } = state
  if (!streak.lastActiveDate) return streak
  if (streak.lastActiveDate === today || streak.lastActiveDate === addDays(today, -1)) {
    return streak
  }
  return { current: 0, best: streak.best, lastActiveDate: streak.lastActiveDate }
}
