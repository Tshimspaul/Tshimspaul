import type { JobStatus } from '../api/client'
import { JOB_STATUS_LABELS } from '../labels'

export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={`badge badge-${status}`}>{JOB_STATUS_LABELS[status]}</span>
}
