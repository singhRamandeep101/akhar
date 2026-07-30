import { letterById, letters } from '../data/letters'
import { matraById, matras } from '../data/matras'
import { wordById, words } from '../data/words'
import type { CurriculumUnit, Letter, Matra, Word } from '../types'

export type QuizQuestion = {
  id: string
  prompt: string
  promptGlyph?: string
  audioSrc?: string
  /** When true, UI should auto-play audio (no name written in the prompt). */
  autoPlayAudio?: boolean
  options: { id: string; label: string }[]
  correctId: string
  weakKey: string
}

/** Letters that look / sound alike — prefer these as wrong answers. */
const LETTER_CONFUSABLES: string[][] = [
  ['ura', 'aira', 'iri'],
  ['sassa', 'haha'],
  ['kakka', 'khakha', 'gagga', 'ghagga', 'nganga'],
  ['chacha', 'chhachha', 'jaja', 'jhajha', 'nyanya'],
  ['tainka', 'thatha', 'dadda', 'dhadda', 'nana'],
  ['tatta', 'thatha2', 'dada', 'dhada', 'nanna'],
  ['pappa', 'phapha', 'babba', 'bhabha', 'mamma'],
  ['yaya', 'rara', 'lalla', 'vava', 'rara2'],
  // Cross-row lookalikes
  ['tainka', 'tatta'],
  ['thatha', 'thatha2'],
  ['dadda', 'dada'],
  ['dhadda', 'dhada'],
  ['nana', 'nanna', 'nganga', 'nyanya'],
  ['rara', 'rara2'],
]

const MATRA_CONFUSABLES: string[][] = [
  ['sihari', 'bihari'],
  ['aunkar', 'dulainkar'],
  ['lanv', 'dulavan'],
  ['horha', 'kanora'],
  ['kanna', 'mukta'],
  ['sihari', 'lanv', 'horha'],
  ['bihari', 'dulavan', 'kanora'],
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function confusableIds(groups: string[][], id: string): string[] {
  const set = new Set<string>()
  for (const g of groups) {
    if (g.includes(id)) for (const x of g) if (x !== id) set.add(x)
  }
  return [...set]
}

function pickHardDistractors<T extends { id: string }>(
  pool: T[],
  correctId: string,
  n: number,
  preferredIds: string[],
): T[] {
  const byId = new Map(pool.map((p) => [p.id, p]))
  const preferred = shuffle(preferredIds.map((id) => byId.get(id)).filter(Boolean) as T[])
  const rest = shuffle(pool.filter((p) => p.id !== correctId && !preferredIds.includes(p.id)))
  return [...preferred, ...rest].slice(0, n)
}

function letterPoolForUnit(unitIds: string[]): Letter[] {
  const unitLetters = unitIds.map((id) => letterById[id]).filter(Boolean)
  // Always allow full alphabet as distractor source so tiny units stay hard
  const ids = new Set(unitLetters.map((l) => l.id))
  const extras = letters.filter((l) => !ids.has(l.id))
  return [...unitLetters, ...extras]
}

export function buildQuiz(unit: CurriculumUnit): QuizQuestion[] {
  const questions: QuizQuestion[] = []

  if (unit.kind === 'letters' && unit.letterIds) {
    const pool = letterPoolForUnit(unit.letterIds)

    for (const id of unit.letterIds) {
      const letter = letterById[id]
      if (!letter) continue
      const hard = confusableIds(LETTER_CONFUSABLES, id)

      // 1) See glyph → pick romanization only (no traditional name crutch)
      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-roman`,
          prompt: 'What sound does this letter make?',
          promptGlyph: letter.glyph,
          options: shuffle([letter, ...distractors]).map((l) => ({
            id: l.id,
            label: l.romanization,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      // 2) Audio only → pick glyph (nothing written about the name)
      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-hear`,
          prompt: 'Listen — which letter is this?',
          audioSrc: letter.audio,
          autoPlayAudio: true,
          options: shuffle([letter, ...distractors]).map((l) => ({
            id: l.id,
            label: l.glyph,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      // 3) Romanization → glyph (recall shape from sound spelling)
      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-from-sound`,
          prompt: `Which letter is “${letter.romanization}”?`,
          options: shuffle([letter, ...distractors]).map((l) => ({
            id: l.id,
            label: l.glyph,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      // 4) Glyph → traditional name (names only — no romanization in the label)
      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-name`,
          prompt: 'What is the traditional name of this letter?',
          promptGlyph: letter.glyph,
          options: shuffle([letter, ...distractors]).map((l) => ({
            id: l.id,
            label: l.name,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      // 5) Example word cue → which letter (when we have an example)
      if (letter.examplePa && letter.exampleEn) {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-example`,
          prompt: `Which letter begins “${letter.examplePa}” (${letter.exampleEn})?`,
          options: shuffle([letter, ...distractors]).map((l) => ({
            id: l.id,
            label: l.glyph,
          })),
          correctId: id,
          weakKey: id,
        })
      }
    }
  }

  if (unit.kind === 'matras' && unit.matraIds) {
    const unitMatras = unit.matraIds.map((mid) => matraById[mid]).filter(Boolean)
    const pool: Matra[] = [...unitMatras, ...matras.filter((m) => !unit.matraIds!.includes(m.id))]

    for (const id of unit.matraIds) {
      const matra = matraById[id]
      if (!matra) continue
      const hard = confusableIds(MATRA_CONFUSABLES, id)

      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-roman`,
          prompt: 'What sound does this matra add (on ਕ)?',
          promptGlyph: matra.example,
          options: shuffle([matra, ...distractors]).map((m) => ({
            id: m.id,
            label: m.romanization || '(inherent a)',
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-hear`,
          prompt: 'Listen — which matra form is this?',
          audioSrc: matra.audio,
          autoPlayAudio: true,
          options: shuffle([matra, ...distractors]).map((m) => ({
            id: m.id,
            label: m.example,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-pick`,
          prompt: `Pick the ਕ-form for “${matra.romanization || 'mukta (inherent a)'}”`,
          options: shuffle([matra, ...distractors]).map((m) => ({
            id: m.id,
            label: m.example,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, hard)
        questions.push({
          id: `${id}-name`,
          prompt: 'Name this matra:',
          promptGlyph: matra.example,
          options: shuffle([matra, ...distractors]).map((m) => ({
            id: m.id,
            label: m.name,
          })),
          correctId: id,
          weakKey: id,
        })
      }
    }
  }

  if (unit.kind === 'words' && unit.wordIds) {
    const unitWords = unit.wordIds.map((wid) => wordById[wid]).filter(Boolean)
    const pool: Word[] = [...unitWords, ...words.filter((w) => !unit.wordIds!.includes(w.id))]

    for (const id of unit.wordIds) {
      const word = wordById[id]
      if (!word) continue

      {
        const distractors = pickHardDistractors(pool, id, 4, [])
        questions.push({
          id: `${id}-meaning`,
          prompt: 'What does this word mean?',
          promptGlyph: word.gurmukhi,
          options: shuffle([word, ...distractors]).map((w) => ({
            id: w.id,
            label: w.meaning,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, [])
        questions.push({
          id: `${id}-read`,
          prompt: `Which word means “${word.meaning}”?`,
          options: shuffle([word, ...distractors]).map((w) => ({
            id: w.id,
            label: w.gurmukhi,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, [])
        questions.push({
          id: `${id}-hear-glyph`,
          prompt: 'Listen — which word is this?',
          audioSrc: word.audio,
          autoPlayAudio: true,
          options: shuffle([word, ...distractors]).map((w) => ({
            id: w.id,
            label: w.gurmukhi,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, [])
        questions.push({
          id: `${id}-hear-meaning`,
          prompt: 'Listen — what does this word mean?',
          audioSrc: word.audio,
          autoPlayAudio: true,
          options: shuffle([word, ...distractors]).map((w) => ({
            id: w.id,
            label: w.meaning,
          })),
          correctId: id,
          weakKey: id,
        })
      }

      {
        const distractors = pickHardDistractors(pool, id, 4, [])
        questions.push({
          id: `${id}-roman`,
          prompt: `Which word is pronounced “${word.romanization}”?`,
          options: shuffle([word, ...distractors]).map((w) => ({
            id: w.id,
            label: w.gurmukhi,
          })),
          correctId: id,
          weakKey: id,
        })
      }
    }
  }

  // Keep it challenging but finite: prefer coverage over a tiny sample
  const shuffled = shuffle(questions)
  const maxQ = unit.kind === 'matras' ? 24 : unit.kind === 'words' ? 20 : 18
  return shuffled.slice(0, Math.min(shuffled.length, maxQ))
}
