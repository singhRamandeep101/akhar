/** Confusable letter pairs for focused drills (after each row). */
export type MinimalPair = {
  id: string
  a: string
  b: string
  tip: string
}

export const minimalPairs: MinimalPair[] = [
  { id: 'ka-kha', a: 'kakka', b: 'khakha', tip: 'ਖ is aspirated — a puff of air after k' },
  { id: 'ga-gha', a: 'gagga', b: 'ghagga', tip: 'ਘ is aspirated g' },
  { id: 'cha-chha', a: 'chacha', b: 'chhachha', tip: 'ਛ is aspirated ch' },
  { id: 'ja-jha', a: 'jaja', b: 'jhajha', tip: 'ਝ is aspirated j' },
  { id: 'ta-tta', a: 'tatta', b: 'tainka', tip: 'ਤ dental (soft) vs ਟ retroflex (tongue curled)' },
  { id: 'tha-ttha', a: 'thatha2', b: 'thatha', tip: 'ਥ dental aspirated vs ਠ retroflex aspirated' },
  { id: 'da-dda', a: 'dada', b: 'dadda', tip: 'ਦ dental vs ਡ retroflex' },
  { id: 'dha-ddha', a: 'dhada', b: 'dhadda', tip: 'ਧ dental aspirated vs ਢ retroflex aspirated' },
  { id: 'na-nna', a: 'nanna', b: 'nana', tip: 'ਨ dental vs ਣ retroflex' },
  { id: 'pa-pha', a: 'pappa', b: 'phapha', tip: 'ਫ is aspirated p' },
  { id: 'ba-bha', a: 'babba', b: 'bhabha', tip: 'ਭ is aspirated b' },
  { id: 'ra-rra', a: 'rara', b: 'rara2', tip: 'ਰ tap vs ੜ flap (often sounds d-like)' },
  { id: 'sa-ha', a: 'sassa', b: 'haha', tip: 'ਸ hiss vs ਹ breath' },
  { id: 'ura-aira', a: 'ura', b: 'aira', tip: 'ੳ oo-carrier vs ਅ a-carrier' },
]

export const pairsById = Object.fromEntries(minimalPairs.map((p) => [p.id, p]))
