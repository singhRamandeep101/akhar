import { useEffect } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { DrawingBoard } from '../components/DrawingBoard'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { curriculum, lessonKey } from '../data/curriculum'
import { matraById } from '../data/matras'
import { isUnitUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { useAutoPlayAudio } from '../lib/useAutoPlayAudio'
import { adjacentItem, getUnit } from '../lib/units'

export function LearnMatra() {
  const { unitId = '', itemId = '' } = useParams()
  const navigate = useNavigate()
  const { progress, completeLesson, visit } = useProgress()
  const unit = getUnit(unitId)
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)
  const matra = matraById[itemId]

  useAutoPlayAudio(matra?.audio)

  useEffect(() => {
    if (unit && matra) visit(`/unit/${unitId}/learn/${itemId}`)
  }, [unit, matra, unitId, itemId, visit])

  if (!unit || unit.kind !== 'matras' || !matra) return <Navigate to="/" replace />
  if (!isUnitUnlocked(progress, unitIndex)) return <Navigate to="/" replace />

  const prev = adjacentItem(unit, itemId, -1)
  const next = adjacentItem(unit, itemId, 1)
  const done = progress.completedLessons.includes(lessonKey(unitId, itemId))

  const markAndGo = (to: string) => {
    completeLesson(lessonKey(unitId, itemId))
    navigate(to)
  }

  return (
    <div className="lesson">
      <div className="lesson-nav">
        <Link to="/">← Path</Link>
        <span>
          {unit.title} · {matra.name}
        </span>
      </div>

      <div className="glyph-stage">
        <p className="eyebrow">Matra on ਕ</p>
        <div className="glyph-display" lang="pa">
          {matra.example}
        </div>
        <h1>{matra.name}</h1>
        <p className="roman">
          {matra.exampleRoman} · mark: {matra.mark || '(none)'}
        </p>
        <p className="hint">{matra.soundHint}</p>
        <PlaySoundButton src={matra.audio} />
      </div>

      <section className="write-section">
        <h2>Write it</h2>
        <p>Practice the matra form on the board.</p>
        <DrawingBoard ghostGlyph={matra.example} />
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
