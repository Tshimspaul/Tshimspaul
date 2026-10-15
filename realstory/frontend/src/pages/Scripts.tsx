import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../api/client'
import { bibles, characters, episodes, facts, lines, locations, scenes, sources, type Payload } from '../api/resources'
import type { Character, EpisodeFull, Line, Scene } from '../api/types'
import { FieldForm, type Field } from '../components/FieldForm'
import { RequireProject } from '../components/RequireProject'
import { SortableList } from '../components/Sortable'
import { formatDuration } from '../labels'

const EPISODE_FIELDS: Field[] = [
  { name: 'title', label: 'Titre', required: true },
  { name: 'season', label: 'Saison', type: 'number' },
  { name: 'number', label: 'Numéro', type: 'number' },
  { name: 'ending_type', label: 'Type de fin', type: 'select', options: [{ value: 'resolution', label: 'Conclusion satisfaisante' }, { value: 'cliffhanger', label: 'Suspense' }] },
  { name: 'summary', label: 'Résumé', type: 'textarea' },
  { name: 'opening', label: '1. Scène d’ouverture captivante', type: 'textarea' },
  { name: 'problem', label: '2. Présentation du problème', type: 'textarea' },
  { name: 'conflict', label: '3. Développement du conflit', type: 'textarea' },
  { name: 'tension', label: '4. Moments de tension', type: 'textarea' },
  { name: 'revelations', label: '5. Révélations progressives', type: 'textarea' },
  { name: 'climax', label: '6. Climax', type: 'textarea' },
  { name: 'ending', label: '7. Conclusion ou suspense', type: 'textarea' },
  { name: 'transition_next', label: '8. Transition vers l’épisode suivant', type: 'textarea' },
]

export function Scripts() {
  const { id, mode } = useParams()
  return (
    <RequireProject title="Scénarios">
      {(project) =>
        id ? (mode === 'lecture' ? <Screenplay id={Number(id)} /> : <EpisodeEditor project={project} id={Number(id)} />) : <EpisodeList project={project} />
      }
    </RequireProject>
  )
}

function EpisodeList({ project }: { project: Project }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const bible = useQuery({ queryKey: ['bible', project.id], queryFn: () => bibles.get(project.id) })
  const list = useQuery({ queryKey: ['episodes', project.id], queryFn: () => episodes.list({ project: project.id }) })
  const create = useMutation({
    mutationFn: (d: Payload) => episodes.create({ ...d, project: project.id }),
    onSuccess: (e) => { qc.invalidateQueries(); navigate(`/scenarios/${e.id}`) },
  })
  const nextNumber = (list.data?.filter((e) => e.season === 1).length ?? 0) + 1
  const planned = bible.data ? bible.data.seasons * bible.data.episodes_per_season : null

  return (
    <section className="card">
      <header className="page-header">
        <h2>Épisodes ({list.data?.length ?? 0}{planned ? ` sur ${planned} prévus` : ''})</h2>
        {bible.data?.validated_at && !creating && <button className="primary" onClick={() => setCreating(true)}>Nouvel épisode</button>}
      </header>
      {bible.data && !bible.data.validated_at && (
        <p className="banner warn">La bible de série doit être validée avant d’écrire les épisodes. <Link to="/bible">Ouvrir la bible</Link></p>
      )}
      {creating && (
        <div className="subcard">
          <FieldForm fields={EPISODE_FIELDS.slice(0, 5)} initial={{ season: 1, number: nextNumber }} submitLabel="Créer l’épisode" error={create.error?.message} pending={create.isPending} onSubmit={(d) => create.mutate(d)} onCancel={() => setCreating(false)} columns />
        </div>
      )}
      {list.data?.length === 0 && <p className="muted">Aucun épisode.</p>}
      <table className="table">
        <thead><tr><th>Code</th><th>Titre</th><th>Scènes</th><th>Durée estimée</th><th>Fin</th><th /></tr></thead>
        <tbody>
          {list.data?.map((e) => (
            <tr key={e.id}>
              <td className="code">{e.code}</td>
              <td><Link to={`/scenarios/${e.id}`}>{e.title}</Link></td>
              <td>{e.scene_count}</td>
              <td>{formatDuration(e.duration_s)}</td>
              <td>{e.ending_type_label}</td>
              <td><Link to={`/scenarios/${e.id}/lecture`}>Lire le scénario</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function useProjectLists(projectId: number) {
  const chars = useQuery({ queryKey: ['characters', projectId], queryFn: () => characters.list({ project: projectId }) })
  const locs = useQuery({ queryKey: ['locations', projectId], queryFn: () => locations.list({ project: projectId }) })
  const fcts = useQuery({ queryKey: ['facts', projectId, ''], queryFn: () => facts.list({ project: projectId }) })
  const srcs = useQuery({ queryKey: ['sources', projectId], queryFn: () => sources.list({ project: projectId }) })
  return { chars: chars.data ?? [], locs: locs.data ?? [], facts: fcts.data ?? [], sources: srcs.data ?? [] }
}

function sceneFields(l: ReturnType<typeof useProjectLists>): Field[] {
  return [
    { name: 'heading', label: 'Titre de la scène', required: true },
    { name: 'location', label: 'Lieu', type: 'select', nullable: true, options: l.locs.map((x) => ({ value: x.id, label: `${x.code} · ${x.name}` })) },
    { name: 'time_of_day', label: 'Heure ou moment' },
    { name: 'period', label: 'Période' },
    { name: 'estimated_duration_s', label: 'Durée estimée (secondes)', type: 'number' },
    { name: 'is_flashback', label: 'Retour en arrière', type: 'checkbox' },
    { name: 'characters', label: 'Personnages présents', type: 'multiselect', options: l.chars.map((c) => ({ value: c.id, label: c.name })) },
    { name: 'facts', label: 'Éléments historiques représentés', type: 'multiselect', options: l.facts.map((f) => ({ value: f.id, label: `${f.code} · ${f.category_label} · ${f.statement.slice(0, 60)}` })) },
    { name: 'action', label: 'Actions', type: 'textarea' },
    { name: 'emotions', label: 'Émotions', type: 'textarea' },
    { name: 'camera_notes', label: 'Mouvements de caméra', type: 'textarea' },
    { name: 'sound_notes', label: 'Indications sonores', type: 'textarea' },
    { name: 'music_notes', label: 'Indications musicales', type: 'textarea' },
  ]
}

function EpisodeEditor({ project, id }: { project: Project; id: number }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const full = useQuery({ queryKey: ['episode', id], queryFn: () => episodes.full(id) })
  const lists = useProjectLists(project.id)
  const [editingEpisode, setEditingEpisode] = useState(false)
  const [newScene, setNewScene] = useState(false)
  const done = () => qc.invalidateQueries()
  const saveEpisode = useMutation({ mutationFn: (d: Payload) => episodes.update(id, d), onSuccess: () => { setEditingEpisode(false); done() } })
  const removeEpisode = useMutation({ mutationFn: () => episodes.remove(id), onSuccess: () => { done(); navigate('/scenarios') } })
  const createScene = useMutation({ mutationFn: (d: Payload) => scenes.create({ ...d, episode: id }), onSuccess: () => { setNewScene(false); done() } })
  const reorder = useMutation({ mutationFn: (ids: number[]) => episodes.post(id, 'reorder-scenes', { ids }), onSettled: done })

  if (!full.data) return full.error ? <p className="error">{full.error.message}</p> : <p className="muted">Chargement…</p>
  const { episode, target_duration_s, warnings } = full.data
  const list = reorder.isPending ? reorder.variables.map((i) => full.data.scenes.find((s) => s.id === i)!) : full.data.scenes

  return (
    <>
      <p className="small"><Link to="/scenarios">← Tous les épisodes</Link> · <Link to={`/scenarios/${id}/lecture`}>Lire le scénario</Link> · <Link to={`/storyboards?episode=${id}`}>Storyboard</Link></p>
      <section className="card">
        <h2><span className="code">{episode.code}</span> {episode.title}</h2>
        <p className="small">
          Durée estimée : <strong>{formatDuration(episode.duration_s)}</strong>
          {target_duration_s && <> sur {formatDuration(target_duration_s)} visées par la bible</>}
        </p>
        {warnings.map((w) => <p key={w} className="banner warn">{w}</p>)}
        {editingEpisode ? (
          <FieldForm fields={EPISODE_FIELDS} initial={episode as Payload} submitLabel="Enregistrer" error={saveEpisode.error?.message} pending={saveEpisode.isPending} onSubmit={(d) => saveEpisode.mutate(d)} onCancel={() => setEditingEpisode(false)} columns />
        ) : (
          <>
            <dl className="facts">
              {EPISODE_FIELDS.slice(4).map((f) => <Fragmentless key={f.name} label={f.label} value={String(episode[f.name] ?? '')} />)}
              <dt>Type de fin</dt><dd>{episode.ending_type_label}</dd>
            </dl>
            <div className="actions">
              <button onClick={() => setEditingEpisode(true)}>Modifier la structure</button>
              <button className="danger" onClick={() => window.confirm(`Supprimer l’épisode ${episode.code} et toutes ses scènes ?`) && removeEpisode.mutate()}>Supprimer l’épisode</button>
            </div>
          </>
        )}
      </section>
      <section className="card">
        <header className="page-header">
          <h2>Scènes ({list.length})</h2>
          {!newScene && <button className="primary" onClick={() => setNewScene(true)}>Nouvelle scène</button>}
        </header>
        {newScene && <div className="subcard"><FieldForm fields={sceneFields(lists)} initial={{ estimated_duration_s: 60 }} submitLabel="Ajouter la scène" error={createScene.error?.message} pending={createScene.isPending} onSubmit={(d) => createScene.mutate(d)} onCancel={() => setNewScene(false)} columns /></div>}
        {reorder.error && <p className="error" role="alert">{reorder.error.message}</p>}
        <SortableList
          items={list}
          onReorder={(ids) => reorder.mutate(ids)}
          label={(s) => s.heading}
          className="stack"
          render={(scene, controls) => <SceneCard scene={scene} index={list.indexOf(scene)} controls={controls} lists={lists} />}
        />
      </section>
    </>
  )
}

function Fragmentless({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
    </>
  )
}

function SceneCard({ scene, index, controls, lists }: { scene: Scene; index: number; controls: React.ReactNode; lists: ReturnType<typeof useProjectLists> }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const done = () => qc.invalidateQueries()
  const save = useMutation({ mutationFn: (d: Payload) => scenes.update(scene.id, d), onSuccess: () => { setEditing(false); done() } })
  const remove = useMutation({ mutationFn: () => scenes.remove(scene.id), onSuccess: done })
  const names = scene.characters.map((id) => lists.chars.find((c) => c.id === id)?.name).filter(Boolean)

  return (
    <article className="scene">
      <header className="item-row">
        <div>
          {controls} <strong>Scène {index + 1} · {scene.heading}</strong> <span className="code">{scene.code}</span>
          {scene.is_flashback && <span className="tag">Retour en arrière</span>}
          <div className="muted small">
            {[scene.location_name, scene.time_of_day, scene.period, formatDuration(scene.estimated_duration_s), names.join(', ')].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="actions">
          <button onClick={() => setEditing(!editing)}>{editing ? 'Fermer' : 'Modifier'}</button>
          <button className="ghost" onClick={() => window.confirm('Supprimer cette scène ?') && remove.mutate()}>Supprimer</button>
        </div>
      </header>
      {editing ? (
        <FieldForm fields={sceneFields(lists)} initial={scene as unknown as Payload} submitLabel="Enregistrer la scène" error={save.error?.message} pending={save.isPending} onSubmit={(d) => save.mutate(d)} columns />
      ) : (
        scene.action && <p className="small">{scene.action}</p>
      )}
      <Dialogue scene={scene} chars={lists.chars} sources={lists.sources} />
    </article>
  )
}

function KindTag({ line }: { line: Line }) {
  return <span className={`tag kind-${line.kind}`}>{line.kind_label}</span>
}

function Dialogue({ scene, chars, sources: srcs }: { scene: Scene; chars: Character[]; sources: { id: number; title: string }[] }) {
  const qc = useQueryClient()
  const [character, setCharacter] = useState<number | ''>('')
  const [text, setText] = useState('')
  const [parenthetical, setParenthetical] = useState('')
  const [kind, setKind] = useState<'reconstructed' | 'authentic'>('reconstructed')
  const [source, setSource] = useState<number | ''>('')
  const done = () => qc.invalidateQueries()
  const add = useMutation({
    mutationFn: () => lines.create({ scene: scene.id, character, text, parenthetical, kind, source: source || null }),
    onSuccess: () => { setText(''); setParenthetical(''); done() },
  })
  const remove = useMutation({ mutationFn: lines.remove, onSuccess: done })
  const reorder = useMutation({ mutationFn: (ids: number[]) => scenes.post(scene.id, 'reorder-lines', { ids }), onSettled: done })
  const selected = chars.find((c) => c.id === character)

  return (
    <div className="dialogue">
      <h4>Dialogues</h4>
      {scene.lines.length === 0 && <p className="muted small">Aucune réplique.</p>}
      <SortableList
        items={scene.lines}
        onReorder={(ids) => reorder.mutate(ids)}
        label={(l) => `la réplique de ${l.character_name}`}
        render={(l, controls) => (
          <div className="line">
            {controls}
            <div>
              <strong>{l.character_name.toUpperCase()}</strong> {l.parenthetical && <em>({l.parenthetical})</em>} <KindTag line={l} />
              <p>{l.text}</p>
            </div>
            <button className="ghost" onClick={() => remove.mutate(l.id)}>Supprimer</button>
          </div>
        )}
      />
      {chars.length === 0 ? <p className="muted small">Créez d’abord des personnages.</p> : (
        <form className="form" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
          <div className="grid-2">
            <label>Personnage
              <select required value={character} onChange={(e) => setCharacter(e.target.value ? Number(e.target.value) : '')}>
                <option value="">—</option>
                {chars.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_real_person ? ' (personne réelle)' : ''}</option>)}
              </select>
            </label>
            <label>Indication de jeu<input value={parenthetical} onChange={(e) => setParenthetical(e.target.value)} placeholder="ex. : à voix basse" /></label>
            {selected?.is_real_person && (
              <>
                <label>Nature de la réplique
                  <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                    <option value="reconstructed">Dialogue reconstitué</option>
                    <option value="authentic">Citation authentique (sourcée)</option>
                  </select>
                </label>
                {kind === 'authentic' && (
                  <label>Source de la citation
                    <select required value={source} onChange={(e) => setSource(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">—</option>
                      {srcs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
            <label className="wide">Réplique<textarea required rows={2} value={text} onChange={(e) => setText(e.target.value)} /></label>
          </div>
          {selected && !selected.is_real_person && <p className="muted small">Personnage fictif : la réplique sera marquée « Dialogue de fiction ».</p>}
          {add.error && <p className="error" role="alert">{add.error.message}</p>}
          <div className="actions"><button className="primary" disabled={add.isPending}>Ajouter la réplique</button></div>
        </form>
      )}
    </div>
  )
}

function Screenplay({ id }: { id: number }) {
  const full = useQuery({ queryKey: ['episode', id], queryFn: () => episodes.full(id) })
  if (!full.data) return <p className="muted">Chargement…</p>
  const { episode, scenes: list }: EpisodeFull = full.data
  return (
    <>
      <p className="small no-print"><Link to={`/scenarios/${id}`}>← Modifier l’épisode</Link> · <button onClick={() => window.print()}>Imprimer</button></p>
      <article className="card screenplay">
        <h2>{episode.code} — {episode.title}</h2>
        {episode.summary && <p><em>{episode.summary}</em></p>}
        <p className="small legend">
          Légende : <span className="tag kind-authentic">Citation authentique (sourcée)</span>{' '}
          <span className="tag kind-reconstructed">Dialogue reconstitué</span>{' '}
          <span className="tag kind-fiction">Dialogue de fiction</span>
        </p>
        {list.map((s, i) => (
          <section key={s.id}>
            <h3>{i + 1}. {s.location_name ? `${s.location_name} — ` : ''}{s.time_of_day || s.heading}{s.is_flashback ? ' (retour en arrière)' : ''}</h3>
            <p className="muted small">{s.heading} · {formatDuration(s.estimated_duration_s)}</p>
            {s.action && <p>{s.action}</p>}
            {s.camera_notes && <p className="small"><strong>Caméra :</strong> {s.camera_notes}</p>}
            {s.sound_notes && <p className="small"><strong>Son :</strong> {s.sound_notes}</p>}
            {s.music_notes && <p className="small"><strong>Musique :</strong> {s.music_notes}</p>}
            {s.lines.map((l) => (
              <div key={l.id} className="speech">
                <div className="speaker">{l.character_name.toUpperCase()} <KindTag line={l} /></div>
                {l.parenthetical && <div className="paren">({l.parenthetical})</div>}
                <div>{l.text}</div>
              </div>
            ))}
          </section>
        ))}
      </article>
    </>
  )
}
