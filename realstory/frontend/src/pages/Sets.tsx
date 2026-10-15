import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { Project } from '../api/client'
import { characters, locations, props, type Payload } from '../api/resources'
import type { Location, Prop } from '../api/types'
import { FieldForm, type Field } from '../components/FieldForm'
import { ReferencePanel } from '../components/ReferencePanel'
import { RequireProject } from '../components/RequireProject'
import { useTab } from '../components/Tabs'

const LOCATION_FIELDS: Field[] = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'setting', label: 'Type', type: 'select', options: [{ value: 'exterior', label: 'Extérieur' }, { value: 'interior', label: 'Intérieur' }] },
  { name: 'period', label: 'Période' },
  { name: 'is_real_place', label: 'Lieu réel', type: 'checkbox' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'documented_details', label: 'Détails documentés', type: 'textarea' },
  { name: 'imagined_details', label: 'Détails imaginés', type: 'textarea' },
  { name: 'lighting_notes', label: 'Lumière et moments de la journée', type: 'textarea' },
  { name: 'locked_description', label: 'Description visuelle de référence (figée)', type: 'textarea' },
  { name: 'continuity_notes', label: 'Règles de continuité', type: 'textarea' },
]

export function Sets() {
  const [tab, bar] = useTab([{ key: 'decors', label: 'Décors' }, { key: 'accessoires', label: 'Accessoires' }])
  return (
    <RequireProject title="Décors">
      {(project) => (
        <>
          {bar}
          {tab === 'decors' ? <Locations project={project} /> : <Props project={project} />}
        </>
      )}
    </RequireProject>
  )
}

function Locations({ project }: { project: Project }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Location | 'new' | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const list = useQuery({ queryKey: ['locations', project.id], queryFn: () => locations.list({ project: project.id }) })
  const save = useMutation({
    mutationFn: (d: Payload) => (editing === 'new' ? locations.create({ ...d, project: project.id }) : locations.update((editing as Location).id, d)),
    onSuccess: () => { setEditing(null); qc.invalidateQueries() },
  })
  const remove = useMutation({ mutationFn: locations.remove, onSuccess: () => qc.invalidateQueries() })
  return (
    <section className="card">
      <header className="page-header">
        <h2>Décors ({list.data?.length ?? 0})</h2>
        {editing === null && <button className="primary" onClick={() => setEditing('new')}>Nouveau décor</button>}
      </header>
      {editing === 'new' && <div className="subcard"><FieldForm fields={LOCATION_FIELDS} submitLabel="Créer" error={save.error?.message} onSubmit={(d) => save.mutate(d)} onCancel={() => setEditing(null)} columns /></div>}
      {list.data?.length === 0 && <p className="muted">Aucun décor.</p>}
      <ul className="items">
        {list.data?.map((l) => (
          <li key={l.id}>
            {editing !== 'new' && editing?.id === l.id ? (
              <FieldForm fields={LOCATION_FIELDS} initial={l as Payload} submitLabel="Enregistrer" error={save.error?.message} onSubmit={(d) => save.mutate(d)} onCancel={() => setEditing(null)} columns />
            ) : (
              <>
                <div className="item-row">
                  <div>
                    <span className="code">{l.code}</span> <strong>{l.name}</strong> <span className="tag">{l.setting_label}</span>
                    {l.is_real_place && <span className="tag">Lieu réel</span>}
                    {l.description && <p className="small">{l.description}</p>}
                  </div>
                  <div className="actions">
                    <button onClick={() => setOpen(open === l.id ? null : l.id)}>Références</button>
                    <button onClick={() => setEditing(l)}>Modifier</button>
                    <button className="ghost" onClick={() => window.confirm(`Supprimer ${l.name} ?`) && remove.mutate(l.id)}>Supprimer</button>
                  </div>
                </div>
                {open === l.id && <ReferencePanel projectId={project.id} target={{ location: l.id }} />}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Props({ project }: { project: Project }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Prop | 'new' | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const list = useQuery({ queryKey: ['props', project.id], queryFn: () => props.list({ project: project.id }) })
  const chars = useQuery({ queryKey: ['characters', project.id], queryFn: () => characters.list({ project: project.id }) })
  const fields: Field[] = [
    { name: 'name', label: 'Nom', required: true },
    { name: 'owner', label: 'Appartient à', type: 'select', nullable: true, options: (chars.data ?? []).map((c) => ({ value: c.id, label: c.name })) },
    { name: 'is_documented', label: 'Objet documenté', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'locked_description', label: 'Description visuelle de référence (figée)', type: 'textarea' },
    { name: 'continuity_notes', label: 'Règles de continuité', type: 'textarea' },
  ]
  const save = useMutation({
    mutationFn: (d: Payload) => (editing === 'new' ? props.create({ ...d, project: project.id }) : props.update((editing as Prop).id, d)),
    onSuccess: () => { setEditing(null); qc.invalidateQueries() },
  })
  const remove = useMutation({ mutationFn: props.remove, onSuccess: () => qc.invalidateQueries() })
  return (
    <section className="card">
      <header className="page-header">
        <h2>Accessoires ({list.data?.length ?? 0})</h2>
        {editing === null && <button className="primary" onClick={() => setEditing('new')}>Nouvel accessoire</button>}
      </header>
      {editing === 'new' && <div className="subcard"><FieldForm fields={fields} submitLabel="Créer" error={save.error?.message} onSubmit={(d) => save.mutate(d)} onCancel={() => setEditing(null)} columns /></div>}
      {list.data?.length === 0 && <p className="muted">Aucun accessoire.</p>}
      <ul className="items">
        {list.data?.map((p) => (
          <li key={p.id}>
            {editing !== 'new' && editing?.id === p.id ? (
              <FieldForm fields={fields} initial={p as Payload} submitLabel="Enregistrer" error={save.error?.message} onSubmit={(d) => save.mutate(d)} onCancel={() => setEditing(null)} columns />
            ) : (
              <>
                <div className="item-row">
                  <div>
                    <span className="code">{p.code}</span> <strong>{p.name}</strong>
                    {p.owner_name && <span className="muted small"> · appartient à {p.owner_name}</span>}
                    {p.description && <p className="small">{p.description}</p>}
                  </div>
                  <div className="actions">
                    <button onClick={() => setOpen(open === p.id ? null : p.id)}>Références</button>
                    <button onClick={() => setEditing(p)}>Modifier</button>
                    <button className="ghost" onClick={() => window.confirm(`Supprimer ${p.name} ?`) && remove.mutate(p.id)}>Supprimer</button>
                  </div>
                </div>
                {open === p.id && <ReferencePanel projectId={project.id} target={{ prop: p.id }} />}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
