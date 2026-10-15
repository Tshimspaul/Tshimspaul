import { useState, type FormEvent } from 'react'
import type { Project, ProjectInput } from '../api/client'

const EMPTY: ProjectInput = {
  title: '',
  description: '',
  episode_format: 'medium',
  aspect_ratio: '16:9',
  budget_limit: null,
}

interface Props {
  initial?: Project
  submitLabel: string
  pending?: boolean
  error?: string
  onSubmit: (data: ProjectInput) => void
  onCancel?: () => void
}

export function ProjectForm({ initial, submitLabel, pending, error, onSubmit, onCancel }: Props) {
  const [data, setData] = useState<ProjectInput>(initial ?? EMPTY)
  const set = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setData((d) => ({ ...d, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit({ ...data, budget_limit: data.budget_limit === '' ? null : data.budget_limit })
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>
        Titre du projet
        <input required value={data.title} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label>
        Description
        <textarea rows={3} value={data.description} onChange={(e) => set('description', e.target.value)} />
      </label>
      <div className="row">
        <label>
          Format des épisodes
          <select value={data.episode_format} onChange={(e) => set('episode_format', e.target.value as ProjectInput['episode_format'])}>
            <option value="short">Court (3 à 5 min)</option>
            <option value="medium">Intermédiaire (8 à 12 min)</option>
            <option value="long">Long (20 à 30 min)</option>
          </select>
        </label>
        <label>
          Format d’image
          <select value={data.aspect_ratio} onChange={(e) => set('aspect_ratio', e.target.value as ProjectInput['aspect_ratio'])}>
            <option value="16:9">Horizontal 16:9</option>
            <option value="9:16">Vertical 9:16</option>
            <option value="1:1">Carré 1:1</option>
          </select>
        </label>
        <label>
          Budget maximum (€)
          <input
            type="number"
            min="0"
            step="0.01"
            value={data.budget_limit ?? ''}
            onChange={(e) => set('budget_limit', e.target.value)}
            placeholder="Aucun"
          />
        </label>
      </div>
      <p className="muted small">Sans budget, aucune tâche payante ne pourra être approuvée.</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="primary" type="submit" disabled={pending}>{pending ? 'Enregistrement…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>Annuler</button>}
      </div>
    </form>
  )
}
