import { curriculum, lessonKey, unitLessonKeys } from '../data/curriculum'
import { letterById } from '../data/letters'
import { matraById } from '../data/matras'
import { wordById } from '../data/words'
import type { CurriculumUnit } from '../types'

export function getUnit(unitId: string): CurriculumUnit | undefined {
  return curriculum.find((u) => u.id === unitId)
}

export function getUnitItems(unit: CurriculumUnit): { id: string; label: string }[] {
  if (unit.kind === 'letters' && unit.letterIds) {
    return unit.letterIds.map((id) => ({ id, label: letterById[id]?.glyph ?? id }))
  }
  if (unit.kind === 'matras' && unit.matraIds) {
    return unit.matraIds.map((id) => ({ id, label: matraById[id]?.example ?? id }))
  }
  if (unit.kind === 'words' && unit.wordIds) {
    return unit.wordIds.map((id) => ({ id, label: wordById[id]?.gurmukhi ?? id }))
  }
  return []
}

export function nextIncompleteLesson(unit: CurriculumUnit, completed: string[]): string | null {
  for (const key of unitLessonKeys(unit)) {
    if (!completed.includes(key)) {
      return key.split(':')[1] ?? null
    }
  }
  return null
}

export function adjacentItem(unit: CurriculumUnit, itemId: string, dir: -1 | 1): string | null {
  const ids =
    unit.kind === 'letters'
      ? unit.letterIds ?? []
      : unit.kind === 'matras'
        ? unit.matraIds ?? []
        : unit.wordIds ?? []
  const i = ids.indexOf(itemId)
  if (i < 0) return null
  return ids[i + dir] ?? null
}

export { lessonKey }
