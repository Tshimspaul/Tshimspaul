import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, type ProjectStatus } from '../api/client'
import { useActiveProject } from '../activeProject'
import { JobList } from '../components/JobList'
import { ProjectForm } from '../components/ProjectForm'
import { formatMoney } from '../format'

export function ProjectDetail() {
  const id = Number(useParams().id)
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const { setProjectId } = useActiveProject()
  // Opening a project makes it the active one for the production sections.
  useEffect(() => setProjectId(id), [id, setProjectId])

  const project = useQuery({ queryKey: ['project', id], queryFn: () => api.project(id) })
  const jobs = useQuery({
    queryKey: ['jobs', id],
    queryFn: () => api.jobs(id),
    refetchInterval: (q) => (q.state.data?.some((j) => j.status === 'pending' || j.status === 'running') ? 1500 : false),
  })
  const done = () => qc.invalidateQueries()
  const update = useMutation({
    mutationFn: (d: Parameters<typeof api.updateProject>[1]) => api.updateProject(id, d),
    onSuccess: () => {
      setEditing(false)
      done()
    },
  })
  const remove = useMutation({ mutationFn: () => api.deleteProject(id), onSuccess: () => { setProjectId(null); done(); navigate('/projets') } })
  const snapshot = useMutation({ mutationFn: () => api.createJob(id, 'project_snapshot'), onSuccess: done })

  if (project.isPending) return <p className="muted">Chargement…</p>
  if (project.error) return <p className="error" role="alert">{project.error.message}</p>
  const p = project.data

  const setStatus = (status: ProjectStatus) => update.mutate({ status })

  return (
    <>
      <p className="small"><Link to="/projets">← Mes projets</Link></p>
      <header className="page-header">
        <h1>{p.title}</h1>
        <span className="pill">{p.status_label}</span>
      </header>

      <section className="card">
        {editing ? (
          <ProjectForm
            initial={p}
            submitLabel="Enregistrer"
            pending={update.isPending}
            error={update.error?.message}
            onSubmit={(d) => update.mutate(d)}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            {p.description && <p>{p.description}</p>}
            <dl className="facts">
              <dt>Format</dt><dd>{p.episode_format_label}</dd>
              <dt>Image</dt><dd>{p.aspect_ratio}</dd>
              <dt>Budget maximum</dt><dd>{formatMoney(p.budget_limit, p.currency)}</dd>
              <dt>Engagé (estimations comprises)</dt><dd>{formatMoney(p.committed_cost, p.currency)}</dd>
            </dl>
            {update.error && <p className="error" role="alert">{update.error.message}</p>}
            <div className="actions">
              <button onClick={() => setEditing(true)}>Modifier</button>
              {p.status === 'draft' && <button onClick={() => setStatus('active')}>Passer en production</button>}
              {p.status !== 'archived' ? (
                <button onClick={() => setStatus('archived')}>Archiver</button>
              ) : (
                <button onClick={() => setStatus('draft')}>Désarchiver</button>
              )}
              <button
                className="danger"
                onClick={() => {
                  if (window.confirm(`Supprimer définitivement « ${p.title} » et toutes ses tâches ?`)) remove.mutate()
                }}
              >
                Supprimer
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <header className="page-header">
          <h2>Tâches</h2>
          <button className="primary" onClick={() => snapshot.mutate()} disabled={snapshot.isPending}>
            Créer une sauvegarde
          </button>
        </header>
        {snapshot.error && <p className="error" role="alert">{snapshot.error.message}</p>}
        <p className="muted small">
          Les tâches payantes (génération d’images, de vidéos, de voix) arriveront à partir de la phase 3 et
          attendront toujours votre approbation. Les coûts affichés sont des estimations, jamais des tarifs garantis.
        </p>
        {jobs.error && <p className="error" role="alert">{jobs.error.message}</p>}
        {jobs.data && <JobList jobs={jobs.data} currency={p.currency} />}
      </section>
    </>
  )
}
