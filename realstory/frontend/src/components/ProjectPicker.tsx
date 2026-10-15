import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { api, ApiError } from '../api/client'
import { useActiveProject } from '../activeProject'

export function ProjectPicker() {
  const { projectId, setProjectId } = useActiveProject()
  const { data } = useQuery({ queryKey: ['projects', 'picker'], queryFn: () => api.projects() })
  const active = useQuery({ queryKey: ['project', projectId], queryFn: () => api.project(projectId!), enabled: projectId !== null })

  // Forget the active project only once the server confirms it is gone
  // (the list above may be stale right after a project is created).
  useEffect(() => {
    if (active.error instanceof ApiError && active.error.status === 404) setProjectId(null)
  }, [active.error, setProjectId])

  const options = data?.filter((p) => p.status !== 'archived' || p.id === projectId) ?? []
  if (active.data && !options.some((p) => p.id === active.data.id)) options.unshift(active.data)

  return (
    <label className="picker">
      Projet actif
      <select value={projectId ?? ''} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}>
        <option value="">— Aucun —</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
    </label>
  )
}
