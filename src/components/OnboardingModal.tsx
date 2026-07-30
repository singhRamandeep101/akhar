import { useProgress } from '../lib/ProgressContext'

const STEPS = [
  {
    title: 'Hear it',
    body: 'Every letter plays its sound when you open the lesson. Tap Play anytime to hear again.',
  },
  {
    title: 'Trace it',
    body: 'Follow the faint guide on the board, then Check. Score high enough to unlock Next.',
  },
  {
    title: 'Quiz hard',
    body: 'Unit quizzes need 90%. Misses go to Review and come back as “due today” so they stick.',
  },
]

export function OnboardingModal() {
  const { progress, finishOnboarding } = useProgress()
  if (progress.onboardingDone) return null

  return (
    <div className="onboard-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-card">
        <p className="eyebrow">Welcome to Akhar</p>
        <h2 id="onboard-title">Learn Gurmukhi for real</h2>
        <ol className="onboard-steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <strong>{s.title}</strong>
              <span>{s.body}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-primary" onClick={finishOnboarding}>
          Start learning
        </button>
      </div>
    </div>
  )
}
