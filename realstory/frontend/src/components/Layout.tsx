import { NavLink, Outlet } from 'react-router-dom'
import { SECTIONS } from '../sections'

export function Layout() {
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Navigation principale">
        <div className="brand">
          RealStory<span>Animation Studio</span>
        </div>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.path}>
              <NavLink to={s.path} end={s.path === '/'}>
                {s.label}
                {s.phase > 1 && <small>Phase {s.phase}</small>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
