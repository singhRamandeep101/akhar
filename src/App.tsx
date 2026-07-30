import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProgressProvider } from './lib/ProgressContext'
import { Home } from './pages/Home'
import { Review } from './pages/Review'
import { UnitLearnEntry, UnitLearnItem } from './pages/UnitLearn'
import { UnitQuiz } from './pages/UnitQuiz'

export default function App() {
  return (
    <ProgressProvider>
      {/* HashRouter so GitHub Pages deep links work without a server rewrite */}
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="review" element={<Review />} />
            <Route path="unit/:unitId/learn" element={<UnitLearnEntry />} />
            <Route path="unit/:unitId/learn/:itemId" element={<UnitLearnItem />} />
            <Route path="unit/:unitId/quiz" element={<UnitQuiz />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </ProgressProvider>
  )
}
