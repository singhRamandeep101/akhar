import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaySoundButton } from '../components/PlaySoundButton'
import { letterById } from '../data/letters'
import { minimalPairs } from '../data/pairs'
import { useProgress } from '../lib/ProgressContext'
import { useAutoPlayAudio } from '../lib/useAutoPlayAudio'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

type Round = {
  pairId: string
  prompt: 'hear' | 'see'
  targetId: string
  otherId: string
  tip: string
}

function buildRounds(): Round[] {
  const rounds: Round[] = []
  for (const pair of shuffle(minimalPairs).slice(0, 8)) {
    const [targetId, otherId] = Math.random() > 0.5 ? [pair.a, pair.b] : [pair.b, pair.a]
    rounds.push({
      pairId: pair.id,
      prompt: Math.random() > 0.5 ? 'hear' : 'see',
      targetId,
      otherId,
      tip: pair.tip,
    })
  }
  return rounds
}

export function DrillPairs() {
  const { reviewItem } = useProgress()
  const [rounds] = useState(buildRounds)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const round = rounds[index]
  const target = round ? letterById[round.targetId] : null
  const other = round ? letterById[round.otherId] : null
  const options = useMemo(() => {
    if (!target || !other) return []
    return shuffle([target, other])
  }, [target, other])

  useAutoPlayAudio(round?.prompt === 'hear' ? target?.audio : undefined)

  if (done) {
    return (
      <div className="quiz result">
        <Link to="/">← Path</Link>
        <h1>Minimal pairs done</h1>
        <p className="big-score">
          {score}/{rounds.length}
        </p>
        <p>These lookalike drills are what make the hard quiz feel fair later.</p>
        <div className="path-actions">
          <Link className="btn btn-ghost" to="/">
            Home
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              window.location.reload()
            }}
          >
            Drill again
          </button>
        </div>
      </div>
    )
  }

  if (!round || !target || !other) return null

  const answer = (id: string) => {
    if (picked) return
    setPicked(id)
    const good = id === target.id
    if (good) setScore((s) => s + 1)
    reviewItem(target.id, good)
  }

  const next = () => {
    if (index + 1 >= rounds.length) {
      setDone(true)
      return
    }
    setPicked(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="quiz">
      <Link to="/">← Path</Link>
      <div className="quiz-progress">
        Pair drill {index + 1} / {rounds.length}
      </div>
      <h1>{round.prompt === 'hear' ? 'Listen — which letter?' : 'Name this lookalike'}</h1>
      {round.prompt === 'see' && (
        <div className="glyph-display quiz-glyph" lang="pa">
          {target.glyph}
        </div>
      )}
      {round.prompt === 'hear' && (
        <PlaySoundButton src={target.audio} label="Replay" className="btn btn-ghost" />
      )}
      <div className="options">
        {options.map((opt) => {
          let cls = 'option'
          if (picked) {
            if (opt.id === target.id) cls += ' correct'
            else if (opt.id === picked) cls += ' wrong'
          }
          return (
            <button
              key={opt.id}
              type="button"
              className={cls}
              disabled={!!picked}
              onClick={() => answer(opt.id)}
            >
              <span lang="pa">{opt.glyph}</span>
              <span className="option-sub">
                {opt.name} · {opt.romanization}
              </span>
            </button>
          )
        })}
      </div>
      {picked && <p className="hint">{round.tip}</p>}
      {picked && (
        <button type="button" className="btn btn-primary" onClick={next}>
          {index + 1 >= rounds.length ? 'See results' : 'Next'}
        </button>
      )}
    </div>
  )
}
