import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { DrawingBoard } from '../components/DrawingBoard'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { PronounceCompare } from '../components/PronounceCompare'
import { curriculum, lessonKey } from '../data/curriculum'
import { letterById } from '../data/letters'
import type { ScoreResult } from '../lib/drawingScore'
import { DRAW_PASS_PERCENT } from '../lib/drawingScore'
import { hasDrawingPassed, isUnitUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { useAutoPlayAudio } from '../lib/useAutoPlayAudio'
import { adjacentItem, getUnit } from '../lib/units'

export function LearnLetter() {
  const { unitId = '', itemId = '' } = useParams()
  const navigate = useNavigate()
  const { progress, completeLesson, passDrawing, visit } = useProgress()
  const unit = getUnit(unitId)
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)
  const letter = letterById[itemId]
  const key = lessonKey(unitId, itemId)
  const [showGuide, setShowGuide] = useState(true)

  useAutoPlayAudio(letter?.audio)

  useEffect(() => {
    if (unit && letter) visit(`/unit/${unitId}/learn/${itemId}`)
  }, [unit, letter, unitId, itemId, visit])

  if (!unit || unit.kind !== 'letters' || !letter) {
    return <Navigate to="/" replace />
  }
  if (!isUnitUnlocked(progress, unitIndex)) {
    return <Navigate to="/" replace />
  }

  const prev = adjacentItem(unit, itemId, -1)
  const next = adjacentItem(unit, itemId, 1)
  const canAdvance = hasDrawingPassed(progress, key)
  const done = progress.completedLessons.includes(key)

  const onScore = (result: ScoreResult) => {
    if (result.passed) passDrawing(key)
  }

  const markAndGo = (to: string) => {
    if (!hasDrawingPassed(progress, key)) return
    completeLesson(key)
    navigate(to)
  }

  return (
    <div className="lesson">
      <div className="lesson-nav">
        <Link to="/">← Path</Link>
        <span>
          {unit.title} · {letter.name}
        </span>
      </div>

      <div className="glyph-stage">
        <p className="eyebrow">Letter</p>
        <div className="glyph-display" lang="pa">
          {letter.glyph}
        </div>
        <h1>{letter.name}</h1>
        <p className="roman">
          {letter.romanization}
          {letter.examplePa && letter.exampleEn
            ? ` · e.g. ${letter.examplePa} (${letter.exampleEn})`
            : ''}
        </p>
        <p className="hint">{letter.soundHint}</p>
        <PlaySoundButton src={letter.audio} />
        <PronounceCompare nativeSrc={letter.audio} label="Say it like the recording" />
      </div>

      <section className="write-section">
        <h2>1. Watch · 2. Trace · 3. Check</h2>
        <p>
          Watch the letter appear, then trace the faint guide. Tap <strong>Check drawing</strong> — score
          at least {DRAW_PASS_PERCENT}% to unlock Next.
          {canAdvance ? ' Drawing passed for this letter.' : ''}
        </p>
        <label className="guide-toggle">
          <input type="checkbox" checked={showGuide} onChange={(e) => setShowGuide(e.target.checked)} />
          Show guide (off = memory practice)
        </label>
        <DrawingBoard
          key={key}
          ghostGlyph={letter.glyph}
          onScore={onScore}
          autoDemo
          showGuide={showGuide}
        />
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
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canAdvance}
            title={canAdvance ? undefined : `Pass the drawing check first (${DRAW_PASS_PERCENT}%+)`}
            onClick={() => markAndGo(`/unit/${unitId}/learn/${next}`)}
          >
            {done ? 'Next' : 'Mark done & next'}
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
      {!canAdvance && (
        <p className="center-note hint">
          Next stays locked until your drawing scores {DRAW_PASS_PERCENT}% or higher.
        </p>
      )}
    </div>
  )
}
