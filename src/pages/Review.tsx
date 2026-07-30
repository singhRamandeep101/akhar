import { Link } from 'react-router-dom'
import { curriculum, lessonKey, unitLessonKeys } from '../data/curriculum'
import { letterById } from '../data/letters'
import { matraById } from '../data/matras'
import { wordById } from '../data/words'
import { getDueItems } from '../lib/progress'
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
      label: `${word.emoji ?? ''} ${word.romanization} — ${word.meaning}`.trim(),
      kind: 'word' as const,
    }
  }
  return { glyph: '', label: itemId, kind: 'unknown' as const }
}

export function Review() {
  const { progress, reviewItem } = useProgress()
  const due = getDueItems(progress, 20)

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

  return (
    <div className="review">
      <Link to="/">← Path</Link>
      <h1>Review</h1>
      <p>Due cards first (spaced repetition), then everything you’ve completed.</p>

      <section className="review-section">
        <h2>Due today ({due.length})</h2>
        {due.length === 0 ? (
          <p className="hint">Nothing due — do a lesson or quiz, then come back tomorrow.</p>
        ) : (
          <ul className="review-list due-actions">
            {due.map((card) => {
              const info = resolveItem(card.itemId)
              const unit = curriculum.find(
                (u) =>
                  u.letterIds?.includes(card.itemId) ||
                  u.matraIds?.includes(card.itemId) ||
                  u.wordIds?.includes(card.itemId),
              )
              const path = unit ? `/unit/${unit.id}/learn/${card.itemId}` : '/'
              return (
                <li key={card.itemId}>
                  <Link to={path}>
                    <span className="chip-glyph" lang="pa">
                      {info.glyph}
                    </span>
                    <span>
                      <strong>{unit?.title ?? 'Item'}</strong>
                      <br />
                      {info.label}
                    </span>
                  </Link>
                  <div className="path-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => reviewItem(card.itemId, false)}>
                      Again
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => reviewItem(card.itemId, true)}>
                      Got it
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Link className="btn btn-accent" to="/drill">
          Run minimal-pair drill
        </Link>
      </section>

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
