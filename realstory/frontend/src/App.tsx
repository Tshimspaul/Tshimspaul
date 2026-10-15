import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Planned } from './pages/Planned'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { SECTIONS } from './sections'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="projets" element={<Projects />} />
        <Route path="projets/:id" element={<ProjectDetail />} />
        {SECTIONS.filter((s) => s.phase > 1).map((s) => (
          <Route key={s.path} path={s.path} element={<Planned section={s} />} />
        ))}
        <Route path="*" element={<p>Page introuvable.</p>} />
      </Route>
    </Routes>
  )
}
