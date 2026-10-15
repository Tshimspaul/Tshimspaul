import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api, type JobStatus } from '../api/client'
import { JobList } from '../components/JobList'
import { JOB_STATUS_LABELS } from '../labels'

const ORDER: JobStatus[] = ['needs_approval', 'pending', 'running', 'completed', 'failed']

export function Dashboard() {
  const { data, error, isPending } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard,
    refetchInterval: (q) => ((q.state.data?.jobs.pending ?? 0) + (q.state.data?.jobs.running ?? 0) > 0 ? 2000 : false),
  })

  if (isPending) return <p className="muted">Chargement…</p>
  if (error) return <p className="error" role="alert">{error.message}</p>

  return (
    <>
      <header className="page-header">
        <h1>Tableau de bord</h1>
        <Link className="button primary" to="/projets?nouveau=1">Nouveau projet</Link>
      </header>

      <section className="tiles" aria-label="Tâches par état">
        <div className="tile">
          <span className="tile-value">{data.projects.total}</span>
          <span className="tile-label">Projets</span>
        </div>
        {ORDER.map((s) => (
          <div key={s} className={`tile tile-${s}`}>
            <span className="tile-value">{data.jobs[s]}</span>
            <span className="tile-label">{JOB_STATUS_LABELS[s]}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Projets récents</h2>
        {data.recent_projects.length === 0 ? (
          <p className="muted">Aucun projet. <Link to="/projets?nouveau=1">Créer le premier projet</Link></p>
        ) : (
          <ul className="list">
            {data.recent_projects.map((p) => (
              <li key={p.id}>
                <Link to={`/projets/${p.id}`}>{p.title}</Link>
                <span className="muted small"> · {p.status_label} · {p.episode_format_label}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Dernières tâches</h2>
        <JobList jobs={data.recent_jobs} showProject />
      </section>
    </>
  )
}
