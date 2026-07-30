export type Letter = {
  id: string
  glyph: string
  name: string
  romanization: string
  soundHint: string
  ttsText: string
  audio: string
  examplePa?: string
  exampleEn?: string
}

export type Matra = {
  id: string
  mark: string
  name: string
  romanization: string
  example: string
  exampleRoman: string
  soundHint: string
  ttsText: string
  audio: string
}

export type Word = {
  id: string
  gurmukhi: string
  romanization: string
  meaning: string
  letterIds: string[]
  ttsText: string
  audio: string
  /** Picture stand-in for image↔word drills (emoji). */
  emoji?: string
}

export type UnitKind = 'letters' | 'matras' | 'words'

export type CurriculumUnit = {
  id: string
  title: string
  subtitle: string
  kind: UnitKind
  letterIds?: string[]
  matraIds?: string[]
  wordIds?: string[]
}

export type QuizScore = {
  unitId: string
  score: number
  total: number
  percent: number
  passed: boolean
  at: string
}

/** Spaced-repetition card for a letter / matra / word id. */
export type MemoryCard = {
  itemId: string
  /** 0–5 ease / strength bucket */
  box: number
  dueAt: string
  lastResult: 'good' | 'again' | null
  seenAt: string
}

export type StreakState = {
  current: number
  best: number
  lastActiveDate: string | null
}

export type DailyGoalState = {
  date: string
  target: number
  completed: number
}

export type ProgressState = {
  version: 1
  completedLessons: string[]
  drawingPassed: string[]
  unlockedUnitIndex: number
  quizScores: QuizScore[]
  weakItems: string[]
  lastVisited: string | null
  streak: StreakState
  memory: Record<string, MemoryCard>
  dailyGoal: DailyGoalState
  onboardingDone: boolean
}

export type StrengthLevel = 'cold' | 'fading' | 'fresh' | 'strong'
