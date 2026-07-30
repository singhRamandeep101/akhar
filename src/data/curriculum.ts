import type { CurriculumUnit } from '../types'

export const PASS_PERCENT = 90

export const curriculum: CurriculumUnit[] = [
  {
    id: 'vowel-carriers',
    title: 'Vowel carriers',
    subtitle: 'ੳ ਅ ੲ — the foundation',
    kind: 'letters',
    letterIds: ['ura', 'aira', 'iri'],
  },
  {
    id: 'sassa-haha',
    title: 'Sassa & Haha',
    subtitle: 'ਸ ਹ',
    kind: 'letters',
    letterIds: ['sassa', 'haha'],
  },
  {
    id: 'ka-row',
    title: 'Ka row',
    subtitle: 'ਕ ਖ ਗ ਘ ਙ',
    kind: 'letters',
    letterIds: ['kakka', 'khakha', 'gagga', 'ghagga', 'nganga'],
  },
  {
    id: 'cha-row',
    title: 'Cha row',
    subtitle: 'ਚ ਛ ਜ ਝ ਞ',
    kind: 'letters',
    letterIds: ['chacha', 'chhachha', 'jaja', 'jhajha', 'nyanya'],
  },
  {
    id: 'ta-row',
    title: 'Ṭa row (retroflex)',
    subtitle: 'ਟ ਠ ਡ ਢ ਣ',
    kind: 'letters',
    letterIds: ['tainka', 'thatha', 'dadda', 'dhadda', 'nana'],
  },
  {
    id: 'tta-row',
    title: 'Ta row (dental)',
    subtitle: 'ਤ ਥ ਦ ਧ ਨ',
    kind: 'letters',
    letterIds: ['tatta', 'thatha2', 'dada', 'dhada', 'nanna'],
  },
  {
    id: 'pa-row',
    title: 'Pa row',
    subtitle: 'ਪ ਫ ਬ ਭ ਮ',
    kind: 'letters',
    letterIds: ['pappa', 'phapha', 'babba', 'bhabha', 'mamma'],
  },
  {
    id: 'ya-row',
    title: 'Ya row',
    subtitle: 'ਯ ਰ ਲ ਵ ੜ',
    kind: 'letters',
    letterIds: ['yaya', 'rara', 'lalla', 'vava', 'rara2'],
  },
  {
    id: 'matras',
    title: 'Matras',
    subtitle: 'Vowel marks on ਕ',
    kind: 'matras',
    matraIds: [
      'mukta',
      'kanna',
      'sihari',
      'bihari',
      'aunkar',
      'dulainkar',
      'lanv',
      'dulavan',
      'horha',
      'kanora',
    ],
  },
  {
    id: 'words-1',
    title: 'First words',
    subtitle: 'Join letters & read',
    kind: 'words',
    wordIds: ['ghar', 'paani', 'haal', 'naam', 'kal', 'bas', 'dil', 'mann'],
  },
  {
    id: 'words-2',
    title: 'More words',
    subtitle: 'Reading practice',
    kind: 'words',
    wordIds: ['rabb', 'sikh', 'putt', 'maa', 'baap', 'roti', 'chai', 'dost'],
  },
]

export function lessonKey(unitId: string, itemId: string) {
  return `${unitId}:${itemId}`
}

export function unitLessonKeys(unit: CurriculumUnit): string[] {
  if (unit.kind === 'letters' && unit.letterIds) {
    return unit.letterIds.map((id) => lessonKey(unit.id, id))
  }
  if (unit.kind === 'matras' && unit.matraIds) {
    return unit.matraIds.map((id) => lessonKey(unit.id, id))
  }
  if (unit.kind === 'words' && unit.wordIds) {
    return unit.wordIds.map((id) => lessonKey(unit.id, id))
  }
  return []
}
