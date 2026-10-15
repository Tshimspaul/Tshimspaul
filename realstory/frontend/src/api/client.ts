export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'needs_approval'
export type ProjectStatus = 'draft' | 'active' | 'archived'

export interface Project {
  id: number
  title: string
  description: string
  status: ProjectStatus
  status_label: string
  episode_format: 'short' | 'medium' | 'long'
  episode_format_label: string
  aspect_ratio: '16:9' | '9:16' | '1:1'
  budget_limit: string | null
  currency: string
  committed_cost: string
  created_at: string
  updated_at: string
}

export type ProjectInput = Pick<Project, 'title' | 'description' | 'episode_format' | 'aspect_ratio'> & {
  status?: ProjectStatus
  budget_limit: string | null
}

export interface Job {
  id: number
  project: number
  project_title: string
  kind: string
  label: string
  status: JobStatus
  status_label: string
  is_paid: boolean
  estimated_cost: string | null
  actual_cost: string | null
  result: Record<string, unknown>
  error: string
  attempts: number
  created_at: string
  finished_at: string | null
}

export interface Dashboard {
  projects: { total: number; by_status: Record<ProjectStatus, number> }
  jobs: Record<JobStatus, number>
  recent_projects: Project[]
  recent_jobs: Job[]
}

export interface Page<T> {
  count: number
  results: T[]
}

export class ApiError extends Error {
  readonly data: unknown
  readonly status: number | null
  constructor(message: string, data: unknown, status: number | null = null) {
    super(message)
    this.data = data
    this.status = status
  }
}

function describe(data: unknown): string {
  if (Array.isArray(data)) return data.map(describe).join(' ')
  if (data && typeof data === 'object') {
    return Object.values(data as Record<string, unknown>)
      .map(describe)
      .join(' ')
  }
  if (typeof data === 'string') return data
  return 'Erreur inattendue du serveur.'
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  const isForm = init?.body instanceof FormData
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: isForm ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError('Serveur injoignable. Le backend Django est-il démarré ?', null)
  }
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(describe(data), data, res.status)
  return data as T
}

const body = (data: unknown) => JSON.stringify(data)

export const api = {
  dashboard: () => request<Dashboard>('/dashboard/'),
  projects: (status?: ProjectStatus) =>
    request<Page<Project>>(`/projects/${status ? `?status=${status}` : ''}`).then((p) => p.results),
  project: (id: number) => request<Project>(`/projects/${id}/`),
  createProject: (data: ProjectInput) => request<Project>('/projects/', { method: 'POST', body: body(data) }),
  updateProject: (id: number, data: Partial<ProjectInput>) =>
    request<Project>(`/projects/${id}/`, { method: 'PATCH', body: body(data) }),
  deleteProject: (id: number) => request<void>(`/projects/${id}/`, { method: 'DELETE' }),
  jobs: (project: number) => request<Page<Job>>(`/jobs/?project=${project}`).then((p) => p.results),
  createJob: (project: number, kind: string) =>
    request<Job>('/jobs/', { method: 'POST', body: body({ project, kind }) }),
  jobAction: (id: number, action: 'approve' | 'reject' | 'retry') =>
    request<Job>(`/jobs/${id}/${action}/`, { method: 'POST' }),
  deleteJob: (id: number) => request<void>(`/jobs/${id}/`, { method: 'DELETE' }),
}
