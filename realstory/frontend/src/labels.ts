import type { JobStatus } from './api/client'

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'En attente',
  running: 'En cours',
  completed: 'Terminée',
  failed: 'Échec',
  needs_approval: 'Validation nécessaire',
}
