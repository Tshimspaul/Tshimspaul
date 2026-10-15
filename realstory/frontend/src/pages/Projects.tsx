import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, type ProjectStatus } from '../api/client'
import { ProjectForm } from '../components/ProjectForm'
import { formatDate } from '../format'

export function Projects() {
  const [params, setParams] = useSearchParams()
  const creating = params.has('nouveau')
  const [filter, setFilter] = useState<ProjectStatus | ''>('')
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data, error, isPending } = useQuery({
    queryKey: ['projects', filter],
    queryFn: () => api.projects(filter || undefined),
  })
  const create = useMutation({
    mutationFn: api.createProject,
    onSuccess: (p) => {
      qc.invalidateQueries()
      navigate(`/projets/${p.id}`)
    },
  })

  return (
    <>
      <header className="page-header">
        <h1>Mes projets</h1>
        {!creating && <button className="primary" onClick={() => setParams({ nouveau: '1' })}>Nouveau projet</button>}
      </header>

      {creating && (
        <section className="card">
          <h2>Nouveau projet</h2>
          <ProjectForm
            submitLabel="Créer le projet"
            pending={create.isPending}
            error={create.error?.message}
            onSubmit={(d) => create.mutate(d)}
            onCancel={() => setParams({})}
          />
        </section>
      )}

      <section className="card">
        <label className="inline">
          Afficher
          <select value={filter} onChange={(e) => setFilter(e.target.value as ProjectStatus | '')}>
            <option value="">Tous</option>
            <option value="draft">Brouillons</option>
            <option value="active">En production</option>
            <option value="archived">Archivés</option>
          </select>
        </label>
        {isPending && <p className="muted">Chargement…</p>}
        {error && <p className="error" role="alert">{error.message}</p>}
        {data && data.length === 0 && <p className="muted">Aucun projet.</p>}
        {data && data.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Titre</th><th>Statut</th><th>Format</th><th>Image</th><th>Modifié le</th></tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/projets/${p.id}`}>{p.title}</Link></td>
                  <td>{p.status_label}</td>
                  <td>{p.episode_format_label}</td>
                  <td>{p.aspect_ratio}</td>
                  <td>{formatDate(p.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
