import { Link, Outlet } from 'react-router-dom'
import { overallPercent, syncedStreak } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

export function Layout() {
  const { progress } = useProgress()
  const pct = overallPercent(progress)
  const streak = syncedStreak(progress)

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark">ਪ</span>
          <span className="brand-text">
            <strong>Akhar</strong>
            <small>Punjabi path</small>
          </span>
        </Link>
        <div className="top-meta">
          <span className="streak-pill" title="Daily streak">
            Streak {streak.current}
          </span>
          <div className="top-progress" aria-label={`Overall progress ${pct}%`}>
            <div className="top-progress-track">
              <div className="top-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span>{pct}%</span>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
