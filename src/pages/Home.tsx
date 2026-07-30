import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { OnboardingModal } from '../components/OnboardingModal'
import { curriculum, unitLessonKeys } from '../data/curriculum'
import { letterById } from '../data/letters'
import { matraById } from '../data/matras'
import { wordById } from '../data/words'
import {
  getDueItems,
  hasPassedQuiz,
  isUnitLessonsDone,
  isUnitUnlocked,
  overallPercent,
  syncedDailyGoal,
  unitStrengthSummary,
} from '../lib/progress'
import type { StrengthLevel } from '../types'
import { useProgress } from '../lib/ProgressContext'

const STRENGTH_LABEL: Record<StrengthLevel, string> = {
  cold: 'Cold',
  fading: 'Fading',
  fresh: 'Fresh',
  strong: 'Strong',
}

function resolveLabel(itemId: string) {
  const l = letterById[itemId]
  if (l) return { glyph: l.glyph, label: `${l.name} (${l.romanization})`, pathHint: l.id }
  const m = matraById[itemId]
  if (m) return { glyph: m.example, label: `${m.name} (${m.romanization})`, pathHint: m.id }
  const w = wordById[itemId]
  if (w) return { glyph: w.gurmukhi, label: `${w.emoji ?? ''} ${w.romanization}`.trim(), pathHint: w.id }
  return { glyph: '?', label: itemId, pathHint: itemId }
}

function findLearnPath(itemId: string): string | null {
  for (const unit of curriculum) {
    if (unit.letterIds?.includes(itemId)) return `/unit/${unit.id}/learn/${itemId}`
    if (unit.matraIds?.includes(itemId)) return `/unit/${unit.id}/learn/${itemId}`
    if (unit.wordIds?.includes(itemId)) return `/unit/${unit.id}/learn/${itemId}`
  }
  return null
}

export function Home() {
  const { progress, exportJson, importJson, resetAll } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const pct = overallPercent(progress)
  const goal = syncedDailyGoal(progress)
  const due = useMemo(() => getDueItems(progress, 8), [progress])

  const units = useMemo(
    () =>
      curriculum.map((unit, index) => {
        const unlocked = isUnitUnlocked(progress, index)
        const lessonsDone = isUnitLessonsDone(progress, index)
        const quizPassed = hasPassedQuiz(progress, unit.id)
        const keys = unitLessonKeys(unit)
        const doneCount = keys.filter((k) => progress.completedLessons.includes(k)).length
        const itemIds =
          unit.letterIds ?? unit.matraIds ?? unit.wordIds ?? []
        const strength = unitStrengthSummary(progress, itemIds)
        return { unit, index, unlocked, lessonsDone, quizPassed, doneCount, total: keys.length, strength }
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

  const goalPct = Math.min(100, Math.round((goal.completed / Math.max(1, goal.target)) * 100))

  return (
    <div className="home">
      <OnboardingModal />

      <section className="hero-path">
        <p className="eyebrow">Your curriculum</p>
        <h1>Learn, then quiz. Unlock as you go.</h1>
        <p className="lede">
          See each Gurmukhi letter, hear it, write it. Pass the unit quiz to open the next step —
          then join letters into words.
        </p>
        <div className="habit-row">
          <div className="habit-chip">
            <span className="habit-num">{progress.streak.current}</span>
            <span>day streak</span>
            <small>best {progress.streak.best}</small>
          </div>
          <div className="habit-chip">
            <span className="habit-num">
              {goal.completed}/{goal.target}
            </span>
            <span>today’s goal</span>
            <div className="mini-track">
              <div className="mini-fill" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
          <div className="habit-chip">
            <span className="habit-num">{pct}%</span>
            <span>path done</span>
          </div>
        </div>
        <div className="overall-bar">
          <div className="overall-track">
            <div className="overall-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>{pct}% complete</span>
        </div>
      </section>

      {due.length > 0 && (
        <section className="due-card">
          <div className="due-head">
            <h2>Due today</h2>
            <Link to="/review">Open review →</Link>
          </div>
          <p className="hint">Spaced items that need a quick hit before they fade.</p>
          <ul className="due-list">
            {due.map((card) => {
              const info = resolveLabel(card.itemId)
              const path = findLearnPath(card.itemId)
              return (
                <li key={card.itemId}>
                  {path ? (
                    <Link to={path}>
                      <span className="chip-glyph" lang="pa">
                        {info.glyph}
                      </span>
                      <span>{info.label}</span>
                    </Link>
                  ) : (
                    <span>
                      <span className="chip-glyph" lang="pa">
                        {info.glyph}
                      </span>
                      {info.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="quick-links">
        <Link className="btn btn-accent" to="/drill">
          Minimal-pair drill
        </Link>
        <Link className="btn btn-ghost" to="/review">
          Review desk
        </Link>
      </div>

      <ol className="path-list">
        {units.map(({ unit, index, unlocked, lessonsDone, quizPassed, doneCount, total, strength }) => {
          const status = !unlocked ? 'locked' : quizPassed ? 'done' : lessonsDone ? 'ready' : 'open'
          const firstId = unit.letterIds?.[0] ?? unit.matraIds?.[0] ?? unit.wordIds?.[0] ?? ''
          return (
            <li key={unit.id} className={`path-item status-${status}`}>
              <div className="path-index">{index + 1}</div>
              <div className="path-body">
                <div className="path-head">
                  <h2>{unit.title}</h2>
                  <span className={`strength-dot ${strength}`} title={STRENGTH_LABEL[strength]}>
                    {STRENGTH_LABEL[strength]}
                  </span>
                </div>
                <p>{unit.subtitle}</p>
                <div className="path-meta">
                  <span>
                    Lessons {doneCount}/{total}
                  </span>
                  <span className="path-kind">{unit.kind}</span>
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
                          lessonsDone && firstId
                            ? `/unit/${unit.id}/learn/${firstId}`
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
      </section>
    </div>
  )
}
