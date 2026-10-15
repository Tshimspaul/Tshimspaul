import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Project } from '../api/client'
import { characters, episodes, references, scenes, shots, type Payload } from '../api/resources'
import type { Character, Reference, Scene, Shot } from '../api/types'
import { FieldForm, type Field } from '../components/FieldForm'
import { RequireProject } from '../components/RequireProject'
import { SortableList } from '../components/Sortable'
import { CAMERA_ANGLES, CAMERA_MOVES, formatDuration, SHOT_TYPES } from '../labels'

export function Storyboards() {
  return <RequireProject title="Storyboards">{(project) => <Board project={project} />}</RequireProject>
}

function Board({ project }: { project: Project }) {
  const [params, setParams] = useSearchParams()
  const list = useQuery({ queryKey: ['episodes', project.id], queryFn: () => episodes.list({ project: project.id }) })
  const episodeId = Number(params.get('episode')) || list.data?.[0]?.id
  const full = useQuery({ queryKey: ['episode', episodeId], queryFn: () => episodes.full(episodeId!), enabled: !!episodeId })
  const chars = useQuery({ queryKey: ['characters', project.id], queryFn: () => characters.list({ project: project.id }) })
  const refs = useQuery({ queryKey: ['references', 'project', project.id], queryFn: () => references.list({ project: project.id, current: 1 }) })

  if (list.data?.length === 0) return <section className="card"><p className="muted">Aucun épisode. Écrivez d’abord un épisode dans « Scénarios ».</p></section>
  return (
    <>
      <section className="card">
        <label className="inline">
          Épisode
          <select value={episodeId ?? ''} onChange={(e) => setParams({ episode: e.target.value })}>
            {list.data?.map((e) => <option key={e.id} value={e.id}>{e.code} · {e.title}</option>)}
          </select>
        </label>
        <p className="muted small">Faites glisser les plans par la poignée ⠿, ou utilisez les flèches, pour les réorganiser avant la génération des séquences animées.</p>
      </section>
      {full.data?.scenes.length === 0 && <section className="card"><p className="muted">Cet épisode n’a pas encore de scène.</p></section>}
      {full.data?.scenes.map((s, i) => <SceneBoard key={s.id} scene={s} index={i} chars={chars.data ?? []} refs={refs.data ?? []} />)}
    </>
  )
}

function shotFields(chars: Character[], refs: Reference[]): Field[] {
  return [
    { name: 'description', label: 'Description visuelle', type: 'textarea', required: true },
    { name: 'shot_type', label: 'Type de plan', type: 'select', options: SHOT_TYPES },
    { name: 'camera_angle', label: 'Angle de caméra', type: 'select', options: CAMERA_ANGLES },
    { name: 'camera_movement', label: 'Mouvement de caméra', type: 'select', options: CAMERA_MOVES },
    { name: 'duration_s', label: 'Durée estimée (s)', type: 'number' },
    { name: 'main_character', label: 'Personnage principal', type: 'select', nullable: true, options: chars.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'action', label: 'Action', type: 'textarea' },
    { name: 'dialogue', label: 'Dialogues', type: 'textarea' },
    { name: 'sound_effects', label: 'Effets sonores', type: 'textarea' },
    { name: 'lighting', label: 'Lumière', type: 'textarea' },
    { name: 'references', label: 'Références visuelles', type: 'multiselect', options: refs.map((r) => ({ value: r.id, label: `${r.target_code} · ${r.view_label}${r.expression ? ` (${r.expression})` : ''}` })) },
    { name: 'reference_notes', label: 'Autres références nécessaires', type: 'textarea' },
  ]
}

function SceneBoard({ scene, index, chars, refs }: { scene: Scene; index: number; chars: Character[]; refs: Reference[] }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<number | null>(null)
  const list = useQuery({ queryKey: ['shots', scene.id], queryFn: () => shots.list({ scene: scene.id }) })
  const done = () => qc.invalidateQueries({ queryKey: ['shots', scene.id] })
  const create = useMutation({ mutationFn: (d: Payload) => shots.create({ ...d, scene: scene.id }), onSuccess: () => { setAdding(false); done() } })
  const update = useMutation({ mutationFn: ({ id, d }: { id: number; d: Payload }) => shots.update(id, d), onSuccess: () => { setEditing(null); done() } })
  const remove = useMutation({ mutationFn: shots.remove, onSuccess: done })
  const reorder = useMutation({ mutationFn: (ids: number[]) => scenes.post(scene.id, 'reorder-shots', { ids }), onSettled: done })
  const items: Shot[] = reorder.isPending && list.data ? reorder.variables.map((i) => list.data.find((s) => s.id === i)!) : list.data ?? []
  const total = items.reduce((t, s) => t + Number(s.duration_s), 0)
  const fields = shotFields(chars, refs)

  return (
    <section className="card">
      <header className="page-header">
        <div>
          <h2>Scène {index + 1} · {scene.heading}</h2>
          <p className="muted small">{items.length} plan(s) · {formatDuration(total)} de plans pour {formatDuration(scene.estimated_duration_s)} prévues</p>
        </div>
        {!adding && <button className="primary" onClick={() => setAdding(true)}>Ajouter un plan</button>}
      </header>
      {adding && <div className="subcard"><FieldForm fields={fields} initial={{ duration_s: 3 }} submitLabel="Ajouter le plan" error={create.error?.message} pending={create.isPending} onSubmit={(d) => create.mutate(d)} onCancel={() => setAdding(false)} columns /></div>}
      {(reorder.error || remove.error) && <p className="error" role="alert">{(reorder.error ?? remove.error)!.message}</p>}
      <SortableList
        items={items}
        className="board"
        onReorder={(ids) => reorder.mutate(ids)}
        label={(s) => `le plan ${s.code}`}
        render={(s, controls) =>
          editing === s.id ? (
            <div className="shot editing">
              <FieldForm fields={fields} initial={s as unknown as Payload} submitLabel="Enregistrer" error={update.error?.message} onSubmit={(d) => update.mutate({ id: s.id, d })} onCancel={() => setEditing(null)} />
            </div>
          ) : (
            <article className="shot">
              <header className="item-row">
                <span>{controls}</span>
                <span className="code">P{items.indexOf(s) + 1} · {s.code}</span>
              </header>
              <div className="shot-frame">{s.shot_type_label}</div>
              <p className="small"><strong>{s.description}</strong></p>
              <p className="muted small">{s.camera_angle_label} · {s.camera_movement_label} · {Number(s.duration_s)} s{s.main_character_name && ` · ${s.main_character_name}`}</p>
              {s.action && <p className="small">{s.action}</p>}
              {s.dialogue && <p className="small"><em>« {s.dialogue} »</em></p>}
              {s.sound_effects && <p className="small">Son : {s.sound_effects}</p>}
              {s.lighting && <p className="small">Lumière : {s.lighting}</p>}
              {s.references.length > 0 && <p className="small muted">{s.references.length} référence(s) visuelle(s)</p>}
              <div className="actions">
                <button onClick={() => setEditing(s.id)}>Modifier</button>
                <button className="ghost" onClick={() => window.confirm(`Supprimer le plan ${s.code} ?`) && remove.mutate(s.id)}>Supprimer</button>
              </div>
            </article>
          )
        }
      />
    </section>
  )
}
