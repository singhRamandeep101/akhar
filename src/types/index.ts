export type Letter = {
  id: string
  glyph: string
  name: string
  romanization: string
  soundHint: string
  /** Gurmukhi text sent to Azure when generating the MP3. */
  ttsText: string
  /** Bundled clip path under /public. */
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

export type ProgressState = {
  version: 1
  completedLessons: string[]
  /** Letter lessons where drawing score passed (≥72%). */
  drawingPassed: string[]
  unlockedUnitIndex: number
  quizScores: QuizScore[]
  weakItems: string[]
  lastVisited: string | null
}
