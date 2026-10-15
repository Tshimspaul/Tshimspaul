import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { references } from '../api/resources'
import type { Reference } from '../api/types'
import { formatDate } from '../format'
import { REFERENCE_VIEWS } from '../labels'

type Target = { character: number } | { location: number } | { prop: number }

/** Versioned reference images for one character, location or prop. */
export function ReferencePanel({ projectId, target }: { projectId: number; target: Target }) {
  const qc = useQueryClient()
  const [key, id] = Object.entries(target)[0] as [string, number]
  const list = useQuery({ queryKey: ['references', key, id], queryFn: () => references.list({ [key]: id }) })
  const [view, setView] = useState('face')
  const [history, setHistory] = useState<string | null>(null)
  const done = () => qc.invalidateQueries()
  const upload = useMutation({ mutationFn: references.upload, onSuccess: done })
  const replace = useMutation({ mutationFn: ({ ref, form }: { ref: number; form: FormData }) => references.replace(ref, form), onSuccess: done })
  const makeCurrent = useMutation({ mutationFn: (ref: number) => references.post(ref, 'make-current'), onSuccess: done })
  const remove = useMutation({ mutationFn: references.remove, onSuccess: done })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    form.set('project', String(projectId))
    form.set(key, String(id))
    upload.mutate(form, { onSuccess: () => (e.target as HTMLFormElement).reset() })
  }

  const slot = (r: Reference) => `${r.view}:${r.expression}`
  const current = (list.data ?? []).filter((r) => r.is_current)
  const error = upload.error ?? replace.error ?? makeCurrent.error ?? remove.error

  return (
    <div>
      <form className="form inline-form" onSubmit={submit}>
        <label>Vue
          <select name="view" value={view} onChange={(e) => setView(e.target.value)}>
            {REFERENCE_VIEWS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </label>
        {view === 'expression' && <label>Expression<input name="expression" required placeholder="ex. : colère" /></label>}
        <label>Image<input name="image" type="file" accept="image/*" required /></label>
        <button className="primary" disabled={upload.isPending}>Importer</button>
      </form>
      {error && <p className="error" role="alert">{error.message}</p>}
      {current.length === 0 && <p className="muted small">Aucune image de référence.</p>}
      <div className="gallery">
        {current.map((r) => {
          const versions = (list.data ?? []).filter((x) => slot(x) === slot(r))
          return (
            <figure key={r.id} className="ref">
              <img src={r.image} alt={`${r.view_label} ${r.expression}`} />
              <figcaption>
                <strong>{r.view_label}{r.expression && ` · ${r.expression}`}</strong>
                <span className="muted small">{r.code} · v{r.version} · {formatDate(r.created_at)}</span>
                <label className="button small-btn">
                  Remplacer
                  <input type="file" accept="image/*" hidden onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const form = new FormData()
                    form.set('image', file)
                    replace.mutate({ ref: r.id, form })
                    e.target.value = ''
                  }} />
                </label>
                {versions.length > 1 && (
                  <button className="ghost small-btn" onClick={() => setHistory(history === slot(r) ? null : slot(r))}>
                    Versions ({versions.length})
                  </button>
                )}
                <button className="ghost small-btn" onClick={() => window.confirm('Supprimer cette version ?') && remove.mutate(r.id)}>Supprimer</button>
              </figcaption>
              {history === slot(r) && (
                <ul className="versions small">
                  {versions.map((v) => (
                    <li key={v.id}>
                      <a href={v.image} target="_blank" rel="noreferrer">v{v.version}</a> · {formatDate(v.created_at)}
                      {v.is_current ? ' · actuelle' : <> · <button className="ghost small-btn" onClick={() => makeCurrent.mutate(v.id)}>Revenir à cette version</button></>}
                    </li>
                  ))}
                </ul>
              )}
            </figure>
          )
        })}
      </div>
    </div>
  )
}
