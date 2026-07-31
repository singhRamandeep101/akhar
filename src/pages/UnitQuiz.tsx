import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { PASS_PERCENT, curriculum } from '../data/curriculum'
import { letterById } from '../data/letters'
import { matraById } from '../data/matras'
import { wordById } from '../data/words'
import { hasPassedQuiz, isUnitLessonsDone, isUnitUnlocked, quizBest } from '../lib/progress'
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
  const [reviewingMisses, setReviewingMisses] = useState(false)
  const [result, setResult] = useState<{
    score: number
    total: number
    percent: number
    weak: string[]
    correct: string[]
    misses: { q: QuizQuestion; chosen: string | null }[]
    prevBest: number | null
    newBest: boolean
  } | null>(null)

  const currentQ = session && !finished && !reviewingMisses ? session.questions[session.index] : null
  useAutoPlayAudio(currentQ?.autoPlayAudio ? currentQ.audioSrc : undefined)

  if (!unit) return <Navigate to="/" replace />
  if (!isUnitUnlocked(progress, unitIndex)) return <Navigate to="/" replace />

  const lessonsDone = isUnitLessonsDone(progress, unitIndex)
  const alreadyPassed = hasPassedQuiz(progress, unit.id)
  const prevBest = quizBest(progress, unit.id)

  const start = () => {
    const questions = buildQuiz(unit)
    setSession({
      questions,
      index: 0,
      answers: questions.map(() => null),
    })
    setFinished(false)
    setReviewingMisses(false)
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

  const finalize = (sess: Session) => {
    const { questions, answers } = sess
    let score = 0
    const weak: string[] = []
    const correct: string[] = []
    const misses: { q: QuizQuestion; chosen: string | null }[] = []
    questions.forEach((q, i) => {
      if (answers[i] === q.correctId) {
        score += 1
        if (!weak.includes(q.weakKey) && !correct.includes(q.weakKey)) correct.push(q.weakKey)
      } else {
        const ci = correct.indexOf(q.weakKey)
        if (ci >= 0) correct.splice(ci, 1)
        if (!weak.includes(q.weakKey)) weak.push(q.weakKey)
        misses.push({ q, chosen: answers[i] })
      }
    })
    const percent = Math.round((score / questions.length) * 100)
    const newBest = prevBest == null || percent > prevBest
    finishQuiz(unitId, score, questions.length, weak, correct)
    setResult({ score, total: questions.length, percent, weak, correct, misses, prevBest, newBest })
    if (misses.length) setReviewingMisses(true)
    else setFinished(true)
  }

  const goNext = () => {
    if (!session) return
    if (session.index + 1 >= session.questions.length) {
      finalize(session)
      return
    }
    setSession({ ...session, index: session.index + 1 })
  }

  if (!session && !finished && !reviewingMisses) {
    return (
      <div className="quiz intro">
        <Link to="/">← Path</Link>
        <h1>{unit.title} quiz</h1>
        <p>
          Built to stick — listen, read, and recall under pressure. Pass with{' '}
          <strong>{PASS_PERCENT}%</strong> or higher to unlock the next unit.
          {alreadyPassed ? ' You already passed — retake anytime for practice.' : ''}
        </p>
        {prevBest != null && <p className="hint">Personal best: {prevBest}%</p>}
        <p className="hint">
          Expect look-alike traps, audio-only questions, and fewer free hints. Misses go to Review.
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

  if (reviewingMisses && result) {
    return (
      <div className="quiz result">
        <h1>Review misses</h1>
        <p className="hint">Quick look before your score — spaced review starts here.</p>
        <ul className="miss-list">
          {result.misses.map(({ q, chosen }) => {
            const right = q.options.find((o) => o.id === q.correctId)
            const yours = q.options.find((o) => o.id === chosen)
            return (
              <li key={q.id}>
                <strong>{q.prompt}</strong>
                {q.promptGlyph && (
                  <span className="chip-glyph" lang="pa">
                    {q.promptGlyph}
                  </span>
                )}
                {q.promptEmoji && <span className="pic-emoji">{q.promptEmoji}</span>}
                <div>
                  Correct: <span lang="pa">{right?.label}</span>
                </div>
                <div className="hint">You picked: {yours?.label ?? '—'}</div>
              </li>
            )
          })}
        </ul>
        <button type="button" className="btn btn-primary" onClick={() => { setReviewingMisses(false); setFinished(true) }}>
          See final score
        </button>
      </div>
    )
  }

  if (finished && result) {
    const passed = result.percent >= PASS_PERCENT
    const nextUnit = curriculum[unitIndex + 1]
    return (
      <div className="quiz result">
        <h1>{passed ? 'Solid — unit cleared' : 'Not yet — drill the weak ones'}</h1>
        <p className="big-score">
          {result.score}/{result.total} · {result.percent}%
        </p>
        {result.newBest && <p className="badge ok">New personal best!</p>}
        {result.prevBest != null && !result.newBest && (
          <p className="hint">Personal best stays {result.prevBest}% — beat it next time.</p>
        )}
        <p>
          {passed
            ? nextUnit
              ? `Passed (need ${PASS_PERCENT}%). Next unit is unlocked.`
              : `Passed (need ${PASS_PERCENT}%). You’ve finished the path — keep reviewing anytime.`
            : `Need ${PASS_PERCENT}% to unlock the next unit. Review misses, then retry.`}
        </p>
        {result.weak.length > 0 && (
          <p className="hint">
            Review:{' '}
            {result.weak
              .map((id) => letterById[id]?.glyph || matraById[id]?.example || wordById[id]?.gurmukhi || id)
              .join(' · ')}
          </p>
        )}
        <div className="path-actions">
          <Link className="btn btn-ghost" to="/">
            Back to path
          </Link>
          <Link className="btn btn-ghost" to="/drill">
            Minimal pairs
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
      {q.promptEmoji && <div className="pic-emoji big">{q.promptEmoji}</div>}
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
