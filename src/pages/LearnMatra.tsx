import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { DrawingBoard } from '../components/DrawingBoard'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { curriculum, lessonKey } from '../data/curriculum'
import { matraById } from '../data/matras'
import type { ScoreResult } from '../lib/drawingScore'
import { DRAW_PASS_PERCENT } from '../lib/drawingScore'
import { hasDrawingPassed, isUnitUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { useAutoPlayAudio } from '../lib/useAutoPlayAudio'
import { adjacentItem, getUnit } from '../lib/units'

export function LearnMatra() {
  const { unitId = '', itemId = '' } = useParams()
  const navigate = useNavigate()
  const { progress, completeLesson, passDrawing, visit } = useProgress()
  const unit = getUnit(unitId)
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)
  const matra = matraById[itemId]
  const key = lessonKey(unitId, itemId)
  const [showGuide, setShowGuide] = useState(true)

  useAutoPlayAudio(matra?.audio)

  useEffect(() => {
    if (unit && matra) visit(`/unit/${unitId}/learn/${itemId}`)
  }, [unit, matra, unitId, itemId, visit])

  if (!unit || unit.kind !== 'matras' || !matra) return <Navigate to="/" replace />
  if (!isUnitUnlocked(progress, unitIndex)) return <Navigate to="/" replace />

  const prev = adjacentItem(unit, itemId, -1)
  const next = adjacentItem(unit, itemId, 1)
  const done = progress.completedLessons.includes(key)
  const canAdvance = hasDrawingPassed(progress, key) || done

  const onScore = (result: ScoreResult) => {
    if (result.passed) passDrawing(key)
  }

  const markAndGo = (to: string) => {
    if (!hasDrawingPassed(progress, key) && !done) return
    completeLesson(key)
    navigate(to)
  }

  return (
    <div className="lesson lesson-draw">
      <div className="lesson-nav">
        <Link to="/">← Path</Link>
        <span className="lesson-nav-title">
          {unit.title} · {matra.name}
        </span>
      </div>

      <div className="glyph-stage glyph-stage-desktop">
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

      <div className="glyph-strip glyph-strip-mobile">
        <div className="glyph-strip-char" lang="pa">
          {matra.example}
        </div>
        <div className="glyph-strip-meta">
          <strong>{matra.name}</strong>
          <span>{matra.exampleRoman}</span>
        </div>
        <PlaySoundButton src={matra.audio} label="Play" className="btn btn-accent btn-compact" />
      </div>

      <section className="write-section write-primary">
        <div className="write-head">
          <h2>Trace & check</h2>
          <label className="guide-toggle">
            <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
            Guide
          </label>
        </div>
        <p className="write-blurb">
          Trace the matra form, then <strong>Check</strong> — need {DRAW_PASS_PERCENT}%+ to unlock Next.
          {canAdvance ? ' Passed.' : ''}
        </p>
        <DrawingBoard
          key={key}
          ghostGlyph={matra.example}
          onScore={onScore}
          autoDemo
          showGuide={showGuide}
        />
      </section>

      <details className="mobile-extras">
        <summary>Sound tip</summary>
        <p className="hint">{matra.soundHint}</p>
        <p className="roman">mark: {matra.mark || '(none)'}</p>
      </details>

      <div className="lesson-footer lesson-footer-sticky">
        {prev ? (
          <Link className="btn btn-ghost" to={`/unit/${unitId}/learn/${prev}`}>
            Prev
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdvance}
            title={canAdvance ? undefined : `Pass the drawing check first (${DRAW_PASS_PERCENT}%+)`}
            onClick={() => markAndGo(`/unit/${unitId}/learn/${next}`)}
          >
            {done ? 'Next' : 'Done & next'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdvance}
            title={canAdvance ? undefined : `Pass the drawing check first (${DRAW_PASS_PERCENT}%+)`}
            onClick={() => markAndGo(`/unit/${unitId}/quiz`)}
          >
            Finish & quiz
          </button>
        )}
      </div>
    </div>
  )
}
