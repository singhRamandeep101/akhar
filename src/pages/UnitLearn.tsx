import { Navigate, useParams } from 'react-router-dom'
import { curriculum } from '../data/curriculum'
import { isUnitUnlocked } from '../lib/progress'
import { useProgress } from '../lib/ProgressContext'
import { getUnit, nextIncompleteLesson } from '../lib/units'
import { LearnLetter } from './LearnLetter'
import { LearnMatra } from './LearnMatra'
import { LearnWord } from './LearnWord'

export function UnitLearnEntry() {
  const { unitId = '' } = useParams()
  const { progress } = useProgress()
  const unit = getUnit(unitId)
  const unitIndex = curriculum.findIndex((u) => u.id === unitId)

  if (!unit) return <Navigate to="/" replace />
  if (!isUnitUnlocked(progress, unitIndex)) return <Navigate to="/" replace />

  const itemId = nextIncompleteLesson(unit, progress.completedLessons)
  if (!itemId) return <Navigate to={`/unit/${unitId}/quiz`} replace />
  return <Navigate to={`/unit/${unitId}/learn/${itemId}`} replace />
}

export function UnitLearnItem() {
  const { unitId = '' } = useParams()
  const unit = getUnit(unitId)
  if (!unit) return <Navigate to="/" replace />
  if (unit.kind === 'letters') return <LearnLetter />
  if (unit.kind === 'matras') return <LearnMatra />
  if (unit.kind === 'words') return <LearnWord />
  return <Navigate to="/" replace />
}
