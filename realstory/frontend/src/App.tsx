import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Bible } from './pages/Bible'
import { Characters } from './pages/Characters'
import { Dashboard } from './pages/Dashboard'
import { Planned } from './pages/Planned'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { Scripts } from './pages/Scripts'
import { Sets } from './pages/Sets'
import { Stories } from './pages/Stories'
import { Storyboards } from './pages/Storyboards'
import { CURRENT_PHASE, SECTIONS } from './sections'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="projets" element={<Projects />} />
        <Route path="projets/:id" element={<ProjectDetail />} />
        <Route path="histoires" element={<Stories />} />
        <Route path="bible" element={<Bible />} />
        <Route path="personnages" element={<Characters />} />
        <Route path="personnages/:id" element={<Characters />} />
        <Route path="decors" element={<Sets />} />
        <Route path="scenarios" element={<Scripts />} />
        <Route path="scenarios/:id" element={<Scripts />} />
        <Route path="scenarios/:id/:mode" element={<Scripts />} />
        <Route path="storyboards" element={<Storyboards />} />
        {SECTIONS.filter((s) => s.phase > CURRENT_PHASE).map((s) => (
          <Route key={s.path} path={s.path} element={<Planned section={s} />} />
        ))}
        <Route path="*" element={<p>Page introuvable.</p>} />
      </Route>
    </Routes>
  )
}
