import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api, type Project } from '../api/client'
import { useActiveProject } from '../activeProject'

/** Render children only once a project is selected; passes the project down. */
export function RequireProject({ title, children }: { title: string; children: (project: Project) => ReactNode }) {
  const { projectId } = useActiveProject()
  const project = useQuery({ queryKey: ['project', projectId], queryFn: () => api.project(projectId!), enabled: projectId !== null })

  if (projectId === null) {
    return (
      <>
        <header className="page-header"><h1>{title}</h1></header>
        <section className="card">
          <p>Choisissez d’abord un projet dans le menu « Projet actif », ou <Link to="/projets?nouveau=1">créez-en un</Link>.</p>
        </section>
      </>
    )
  }
  if (project.isPending) return <p className="muted">Chargement…</p>
  if (project.error) return <p className="error" role="alert">{project.error.message}</p>
  return (
    <>
      <header className="page-header">
        <h1>{title}</h1>
        <span className="pill">{project.data.title}</span>
      </header>
      {children(project.data)}
    </>
  )
}
