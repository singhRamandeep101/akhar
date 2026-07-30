import { Link, Outlet } from 'react-router-dom'
import { overallPercent } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'

export function Layout() {
  const { progress } = useProgress()
  const pct = overallPercent(progress)

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
        <div className="top-progress" aria-label={`Overall progress ${pct}%`}>
          <div className="top-progress-track">
            <div className="top-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span>{pct}%</span>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
