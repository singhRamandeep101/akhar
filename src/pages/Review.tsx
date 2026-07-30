import { Link } from 'react-router-dom'
import { curriculum, lessonKey, unitLessonKeys } from '../data/curriculum'
import { letterById } from '../data/letters'
import { matraById } from '../data/matras'
import { wordById } from '../data/words'
import { useProgress } from '../lib/ProgressContext'

function resolveItem(itemId: string) {
  const letter = letterById[itemId]
  if (letter) {
    return {
      glyph: letter.glyph,
      label: `${letter.name} (${letter.romanization})`,
      kind: 'letter' as const,
    }
  }
  const matra = matraById[itemId]
  if (matra) {
    return {
      glyph: matra.example,
      label: `${matra.name} (${matra.romanization})`,
      kind: 'matra' as const,
    }
  }
  const word = wordById[itemId]
  if (word) {
    return {
      glyph: word.gurmukhi,
      label: `${word.romanization} — ${word.meaning}`,
      kind: 'word' as const,
    }
  }
  return { glyph: '', label: itemId, kind: 'unknown' as const }
}

export function Review() {
  const { progress } = useProgress()

  const completed = curriculum.flatMap((unit) => {
    const keys = unitLessonKeys(unit)
    return keys
      .filter((k) => progress.completedLessons.includes(k))
      .map((k) => {
        const itemId = k.split(':')[1]!
        const resolved = resolveItem(itemId)
        return {
          key: lessonKey(unit.id, itemId),
          unit,
          itemId,
          path: `/unit/${unit.id}/learn/${itemId}`,
          ...resolved,
        }
      })
  })

  const weak = progress.weakItems
    .map((itemId) => {
      const resolved = resolveItem(itemId)
      // Prefer the unit that owns this item for a deep link
      const unit = curriculum.find((u) => {
        if (u.kind === 'letters') return u.letterIds?.includes(itemId)
        if (u.kind === 'matras') return u.matraIds?.includes(itemId)
        return u.wordIds?.includes(itemId)
      })
      if (!unit) return null
      return {
        key: `weak:${itemId}`,
        unit,
        itemId,
        path: `/unit/${unit.id}/learn/${itemId}`,
        ...resolved,
      }
    })
    .filter(Boolean)

  return (
    <div className="review">
      <Link to="/">← Path</Link>
      <h1>Review</h1>
      <p>Jump back to completed lessons, or drill items the quiz marked weak.</p>

      {weak.length > 0 && (
        <section className="review-section">
          <h2>Needs work</h2>
          <p className="hint">From recent quiz misses — study these before you retry.</p>
          <ul className="review-list">
            {weak.map((item) =>
              item ? (
                <li key={item.key}>
                  <Link to={item.path}>
                    <span className="chip-glyph" lang="pa">
                      {item.glyph}
                    </span>
                    <span>
                      <strong>{item.unit.title}</strong>
                      <br />
                      {item.label}
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ul>
        </section>
      )}

      <section className="review-section">
        <h2>Completed</h2>
        {completed.length === 0 ? (
          <p className="hint">No completed lessons yet.</p>
        ) : (
          <ul className="review-list">
            {completed.map((item) => (
              <li key={item.key}>
                <Link to={item.path}>
                  <span className="chip-glyph" lang="pa">
                    {item.glyph}
                  </span>
                  <span>
                    <strong>{item.unit.title}</strong>
                    <br />
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
