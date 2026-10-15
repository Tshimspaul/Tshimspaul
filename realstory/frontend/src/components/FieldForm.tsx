import { useState, type FormEvent } from 'react'
import type { Payload } from '../api/resources'

export interface Option {
  value: string | number
  label: string
}

export interface Field {
  name: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'multiselect'
  options?: Option[]
  required?: boolean
  help?: string
  /** Allow an empty choice in a select, sent as null. */
  nullable?: boolean
  rows?: number
}

interface Props {
  fields: Field[]
  initial?: Payload
  submitLabel: string
  pending?: boolean
  error?: string
  onSubmit: (data: Payload) => void
  onCancel?: () => void
  columns?: boolean
}

function initialValue(f: Field, initial?: Payload) {
  const v = initial?.[f.name]
  if (f.type === 'checkbox') return Boolean(v)
  if (f.type === 'multiselect') return Array.isArray(v) ? v : []
  if (v === null || v === undefined) return f.type === 'select' && !f.nullable && f.options?.length ? f.options[0].value : ''
  return v
}

export function FieldForm({ fields, initial, submitLabel, pending, error, onSubmit, onCancel, columns }: Props) {
  const [values, setValues] = useState<Payload>(() =>
    Object.fromEntries(fields.map((f) => [f.name, initialValue(f, initial)])),
  )
  const set = (name: string, v: unknown) => setValues((s) => ({ ...s, [name]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const out: Payload = {}
    for (const f of fields) {
      let v = values[f.name]
      if (f.type === 'number') v = v === '' ? null : Number(v)
      if (f.type === 'select' && v === '') v = null
      if (f.type === 'select' && typeof f.options?.[0]?.value === 'number' && v !== null) v = Number(v)
      out[f.name] = v
    }
    onSubmit(out)
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className={columns ? 'grid-2' : 'stack'}>
        {fields.map((f) => {
          const id = `f-${f.name}`
          const v = values[f.name]
          if (f.type === 'checkbox') {
            return (
              <label key={f.name} className="check">
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.name, e.target.checked)} />
                {f.label}
              </label>
            )
          }
          if (f.type === 'multiselect') {
            const selected = new Set(v as (string | number)[])
            return (
              <fieldset key={f.name} className="multi">
                <legend>{f.label}</legend>
                {f.options?.length ? (
                  f.options.map((o) => (
                    <label key={o.value} className="check">
                      <input
                        type="checkbox"
                        checked={selected.has(o.value)}
                        onChange={(e) => {
                          const next = new Set(selected)
                          if (e.target.checked) next.add(o.value)
                          else next.delete(o.value)
                          set(f.name, [...next])
                        }}
                      />
                      {o.label}
                    </label>
                  ))
                ) : (
                  <span className="muted small">Aucun élément disponible.</span>
                )}
                {f.help && <span className="muted small">{f.help}</span>}
              </fieldset>
            )
          }
          return (
            <label key={f.name} htmlFor={id} className={f.type === 'textarea' ? 'wide' : undefined}>
              {f.label}
              {f.type === 'textarea' ? (
                <textarea id={id} rows={f.rows ?? 3} required={f.required} value={String(v)} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === 'select' ? (
                <select id={id} required={f.required} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)}>
                  {f.nullable && <option value="">—</option>}
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.type === 'number' ? 'any' : undefined}
                  required={f.required}
                  value={String(v ?? '')}
                  onChange={(e) => set(f.name, e.target.value)}
                />
              )}
              {f.help && <span className="muted small help">{f.help}</span>}
            </label>
          )
        })}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="actions">
        <button className="primary" type="submit" disabled={pending}>{pending ? 'Enregistrement…' : submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel}>Annuler</button>}
      </div>
    </form>
  )
}
