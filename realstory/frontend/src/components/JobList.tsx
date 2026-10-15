import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Job } from '../api/client'
import { formatDate, formatMoney } from '../format'
import { StatusBadge } from './StatusBadge'

export function JobList({ jobs, currency = 'EUR', showProject = false }: { jobs: Job[]; currency?: string; showProject?: boolean }) {
  const qc = useQueryClient()
  const action = useMutation({
    mutationFn: async ({ id, kind }: { id: number; kind: 'approve' | 'reject' | 'retry' | 'delete' }) => {
      if (kind === 'delete') await api.deleteJob(id)
      else await api.jobAction(id, kind)
    },
    onSettled: () => qc.invalidateQueries(),
  })

  if (jobs.length === 0) return <p className="muted">Aucune tâche pour le moment.</p>

  return (
    <>
      {action.error && <p className="error" role="alert">{action.error.message}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>Tâche</th>
            {showProject && <th>Projet</th>}
            <th>État</th>
            <th>Coût estimé</th>
            <th>Créée le</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id}>
              <td>
                {job.label}
                {job.error && <div className="error small">{job.error}</div>}
                {typeof job.result.file === 'string' && <div className="muted small">Fichier : {job.result.file}</div>}
              </td>
              {showProject && <td>{job.project_title}</td>}
              <td><StatusBadge status={job.status} /></td>
              <td>
                {job.is_paid ? (
                  <span title="Estimation, pas un tarif garanti">≈ {formatMoney(job.estimated_cost, currency)}</span>
                ) : (
                  'Gratuite'
                )}
              </td>
              <td>{formatDate(job.created_at)}</td>
              <td>
                <div className="actions">
                {job.status === 'needs_approval' && (
                  <>
                    <button className="primary" onClick={() => action.mutate({ id: job.id, kind: 'approve' })}>Approuver</button>
                    <button onClick={() => action.mutate({ id: job.id, kind: 'reject' })}>Refuser</button>
                  </>
                )}
                {job.status === 'failed' && (
                  <button onClick={() => action.mutate({ id: job.id, kind: 'retry' })}>Relancer</button>
                )}
                {job.status !== 'running' && (
                  <button className="ghost" onClick={() => action.mutate({ id: job.id, kind: 'delete' })}>Supprimer</button>
                )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
