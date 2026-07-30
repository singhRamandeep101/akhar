import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { PASS_PERCENT, curriculum } from '../data/curriculum'
import { hasPassedQuiz, isUnitLessonsDone, isUnitUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { buildQuiz, type QuizQuestion } from '../lib/quiz'
import { useAutoPlayAudio } from '../lib/useAutoPlayAudio'
import { getUnit } from '../lib/units'

type Session = {
  questions: QuizQuestion[]
  index: number
  answers: (string | null)[]
}

export function UnitQuiz() {
  const { unitId = '' } = useParams()
  const { progress, finishQuiz } = useProgress()
  const unit = getUnit(unitId)
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)

  const [session, setSession] = useState<Session | null>(null)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState<{ score: number; total: number; weak: string[] } | null>(null)

  const currentQ = session && !finished ? session.questions[session.index] : null
  useAutoPlayAudio(currentQ?.autoPlayAudio ? currentQ.audioSrc : undefined)

  if (!unit) return <Navigate to="/" replace />
  if (!isUnitUnlocked(progress, unitIndex)) return <Navigate to="/" replace />

  const lessonsDone = isUnitLessonsDone(progress, unitIndex)
  const alreadyPassed = hasPassedQuiz(progress, unit.id)

  const start = () => {
    const questions = buildQuiz(unit)
    setSession({
      questions,
      index: 0,
      answers: questions.map(() => null),
    })
    setFinished(false)
    setResult(null)
  }

  const answer = (optionId: string) => {
    if (!session) return
    const { index, answers } = session
    if (answers[index]) return
    const nextAnswers = [...answers]
    nextAnswers[index] = optionId
    setSession({ ...session, answers: nextAnswers })
  }

  const goNext = () => {
    if (!session) return
    const { questions, index, answers } = session
    if (index + 1 >= questions.length) {
      let score = 0
      const weak: string[] = []
      questions.forEach((q, i) => {
        if (answers[i] === q.correctId) score += 1
        else if (!weak.includes(q.weakKey)) weak.push(q.weakKey)
      })
      finishQuiz(unitId, score, questions.length, weak)
      setResult({ score, total: questions.length, weak })
      setFinished(true)
      return
    }
    setSession({ ...session, index: index + 1 })
  }

  if (!session && !finished) {
    return (
      <div className="quiz intro">
        <Link to="/">← Path</Link>
        <h1>{unit.title} quiz</h1>
        <p>
          Built to stick — listen, read, and recall under pressure. Pass with{' '}
          <strong>{PASS_PERCENT}%</strong> or higher to unlock the next unit.
          {alreadyPassed ? ' You already passed — retake anytime for practice.' : ''}
        </p>
        <p className="hint">
          Expect look-alike traps, audio-only questions, and fewer free hints. Misses show up in Review.
        </p>
        {!lessonsDone ? (
          <p className="warn">
            Finish all lessons in this unit first.{' '}
            <Link to={`/unit/${unitId}/learn`}>Continue learning →</Link>
          </p>
        ) : (
          <button type="button" className="btn btn-primary" onClick={start}>
            Start quiz
          </button>
        )}
      </div>
    )
  }

  if (finished && result) {
    const percent = Math.round((result.score / result.total) * 100)
    const passed = percent >= PASS_PERCENT
    const nextUnit = curriculum[unitIndex + 1]
    return (
      <div className="quiz result">
        <h1>{passed ? 'Solid — unit cleared' : 'Not yet — drill the weak ones'}</h1>
        <p className="big-score">
          {result.score}/{result.total} · {percent}%
        </p>
        <p>
          {passed
            ? nextUnit
              ? `Passed (need ${PASS_PERCENT}%). Next unit is unlocked.`
              : `Passed (need ${PASS_PERCENT}%). You’ve finished the path — keep reviewing anytime.`
            : `Need ${PASS_PERCENT}% to unlock the next unit. Review misses, then retry.`}
        </p>
        {result.weak.length > 0 && (
          <p className="hint">Review: {result.weak.join(', ')}</p>
        )}
        <div className="path-actions">
          <Link className="btn btn-ghost" to="/">
            Back to path
          </Link>
          <button type="button" className="btn btn-primary" onClick={start}>
            Retry quiz
          </button>
          {passed && nextUnit && (
            <Link className="btn btn-accent" to={`/unit/${nextUnit.id}/learn`}>
              Next: {nextUnit.title}
            </Link>
          )}
        </div>
      </div>
    )
  }

  if (!session) return null
  const q = session.questions[session.index]
  const selected = session.answers[session.index]

  return (
    <div className="quiz">
      <div className="quiz-progress">
        Question {session.index + 1} / {session.questions.length}
      </div>
      <h1>{q.prompt}</h1>
      {q.promptGlyph && (
        <div className="glyph-display quiz-glyph" lang="pa">
          {q.promptGlyph}
        </div>
      )}
      {q.audioSrc && (
        <PlaySoundButton
          src={q.audioSrc}
          label={q.autoPlayAudio ? 'Replay sound' : 'Hear clue'}
          className="btn btn-ghost"
        />
      )}
      <div className="options">
        {q.options.map((opt) => {
          let cls = 'option'
          if (selected) {
            if (opt.id === q.correctId) cls += ' correct'
            else if (opt.id === selected) cls += ' wrong'
          }
          return (
            <button
              key={opt.id}
              type="button"
              className={cls}
              disabled={!!selected}
              onClick={() => answer(opt.id)}
            >
              <span lang="pa">{opt.label}</span>
            </button>
          )
        })}
      </div>
      {selected && (
        <button type="button" className="btn btn-primary" onClick={goNext}>
          {session.index + 1 >= session.questions.length ? 'See results' : 'Next'}
        </button>
      )}
    </div>
  )
}
