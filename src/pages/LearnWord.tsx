import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { curriculum, lessonKey } from '../data/curriculum'
import { letterById } from '../data/letters'
import { wordById } from '../data/words'
import { isUnitUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { useAutoPlayAudio } from '../lib/useAutoPlayAudio'
import { adjacentItem, getUnit } from '../lib/units'

export function LearnWord() {
  const { unitId = '', itemId = '' } = useParams()
  const navigate = useNavigate()
  const { progress, completeLesson, visit } = useProgress()
  const unit = getUnit(unitId)
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)
  const word = wordById[itemId]

  useAutoPlayAudio(word?.audio)

  useEffect(() => {
    if (unit && word) visit(`/unit/${unitId}/learn/${itemId}`)
  }, [unit, word, unitId, itemId, visit])

  if (!unit || unit.kind !== 'words' || !word) return <Navigate to="/" replace />
  if (!isUnitUnlocked(progress, unitIndex)) return <Navigate to="/" replace />

  const prev = adjacentItem(unit, itemId, -1)
  const next = adjacentItem(unit, itemId, 1)
  const done = progress.completedLessons.includes(lessonKey(unitId, itemId))
  const parts = word.letterIds.map((id) => letterById[id]).filter(Boolean)

  const markAndGo = (to: string) => {
    completeLesson(lessonKey(unitId, itemId))
    navigate(to)
  }

  return (
    <div className="lesson">
      <div className="lesson-nav">
        <Link to="/">← Path</Link>
        <span>
          {unit.title} · {word.romanization}
        </span>
      </div>

      <div className="glyph-stage">
        <p className="eyebrow">Word</p>
        {word.emoji && <div className="pic-emoji big">{word.emoji}</div>}
        <div className="glyph-display word-glyph" lang="pa">
          {word.gurmukhi}
        </div>
        <h1>{word.romanization}</h1>
        <p className="roman">{word.meaning}</p>
        <PlaySoundButton src={word.audio} />
      </div>

      <section className="join-section">
        <h2>How it joins</h2>
        <p>Letters that build this word (base consonants):</p>
        <ul className="letter-chips">
          {parts.map((l) => (
            <li key={l.id}>
              <span className="chip-glyph" lang="pa">
                {l.glyph}
              </span>
              <span>
                {l.name} · {l.romanization}
              </span>
            </li>
          ))}
        </ul>
        <p className="hint">
          Matras and tippi/adhak may also appear in the full spelling — read the whole word as one unit.
        </p>
      </section>

      <div className="lesson-footer">
        {prev ? (
          <Link className="btn btn-ghost" to={`/unit/${unitId}/learn/${prev}`}>
            Previous
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <button type="button" className="btn btn-primary" onClick={() => markAndGo(`/unit/${unitId}/learn/${next}`)}>
            {done ? 'Next' : 'Mark done & next'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => markAndGo(`/unit/${unitId}/quiz`)}>
            Finish & quiz
          </button>
        )}
      </div>
    </div>
  )
}
