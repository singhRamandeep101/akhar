import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { curriculum, unitLessonKeys } from '../data/curriculum'
import {
  hasPassedQuiz,
  isUnitLessonsDone,
  isUnitUnlocked,
  overallPercent,
} from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

export function Home() {
  const { progress, exportJson, importJson, resetAll } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const pct = overallPercent(progress)

  const units = useMemo(
    () =>
      curriculum.map((unit, index) => {
        const unlocked = isUnitUnlocked(progress, index)
        const lessonsDone = isUnitLessonsDone(progress, index)
        const quizPassed = hasPassedQuiz(progress, unit.id)
        const keys = unitLessonKeys(unit)
        const doneCount = keys.filter((k) => progress.completedLessons.includes(k)).length
        return { unit, index, unlocked, lessonsDone, quizPassed, doneCount, total: keys.length }
      }),
    [progress],
  )

  const onExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `akhar-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImportFile = async (file: File) => {
    const text = await file.text()
    importJson(text)
  }

  return (
    <div className="home">
      <section className="hero-path">
        <p className="eyebrow">Your curriculum</p>
        <h1>Learn, then quiz. Unlock as you go.</h1>
        <p className="lede">
          See each Gurmukhi letter, hear it, write it. Pass the unit quiz to open the next step —
          then join letters into words.
        </p>
        <div className="overall-bar">
          <div className="overall-track">
            <div className="overall-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>{pct}% complete</span>
        </div>
      </section>

      <ol className="path-list">
        {units.map(({ unit, index, unlocked, lessonsDone, quizPassed, doneCount, total }) => {
          const status = !unlocked ? 'locked' : quizPassed ? 'done' : lessonsDone ? 'ready' : 'open'
          return (
            <li key={unit.id} className={`path-item status-${status}`}>
              <div className="path-index">{index + 1}</div>
              <div className="path-body">
                <div className="path-head">
                  <h2>{unit.title}</h2>
                  <span className="path-kind">{unit.kind}</span>
                </div>
                <p>{unit.subtitle}</p>
                <div className="path-meta">
                  <span>
                    Lessons {doneCount}/{total}
                  </span>
                  {quizPassed && <span className="badge ok">Quiz passed</span>}
                  {!quizPassed && lessonsDone && unlocked && (
                    <span className="badge ready">Quiz ready</span>
                  )}
                  {!unlocked && <span className="badge lock">Locked</span>}
                </div>
                <div className="path-actions">
                  {unlocked ? (
                    <>
                      <Link
                        className="btn btn-primary"
                        to={
                          lessonsDone
                            ? `/unit/${unit.id}/learn/${
                                unit.letterIds?.[0] ?? unit.matraIds?.[0] ?? unit.wordIds?.[0] ?? ''
                              }`
                            : `/unit/${unit.id}/learn`
                        }
                      >
                        {doneCount === 0
                          ? 'Start learning'
                          : lessonsDone
                            ? 'Review lessons'
                            : 'Continue lessons'}
                      </Link>
                      <Link
                        className={`btn ${lessonsDone ? 'btn-accent' : 'btn-ghost'}`}
                        to={`/unit/${unit.id}/quiz`}
                        aria-disabled={!lessonsDone}
                        onClick={(e) => {
                          if (!lessonsDone) e.preventDefault()
                        }}
                      >
                        Take quiz
                      </Link>
                    </>
                  ) : (
                    <span className="locked-hint">Pass previous quiz to unlock</span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <section className="settings-card">
        <h2>Progress backup</h2>
        <p>Saved on this device only. Export a backup so clearing the browser doesn’t wipe you out.</p>
        <div className="path-actions">
          <button type="button" className="btn btn-primary" onClick={onExport}>
            Export progress
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (confirm('Reset all progress on this device?')) resetAll()
            }}
          >
            Reset
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImportFile(f)
              e.target.value = ''
            }}
          />
        </div>
        <Link className="review-link" to="/review">
          Review completed items →
        </Link>
      </section>
    </div>
  )
}
