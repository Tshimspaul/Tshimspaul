import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Project } from '../api/client'
import { characters, relationships, type Payload } from '../api/resources'
import type { Character, PaletteColor } from '../api/types'
import { FieldForm, type Field } from '../components/FieldForm'
import { PaletteEditor, Swatches } from '../components/Palette'
import { ReferencePanel } from '../components/ReferencePanel'
import { RequireProject } from '../components/RequireProject'
import { REFERENCE_VIEWS } from '../labels'

const ROLES = [
  { value: 'main', label: 'Principal' },
  { value: 'secondary', label: 'Secondaire' },
  { value: 'minor', label: 'Figurant' },
]

const IDENTITY: Field[] = [
  { name: 'name', label: 'Nom', required: true },
  { name: 'role', label: 'Rôle', type: 'select', options: ROLES },
  { name: 'age', label: 'Âge' },
  { name: 'sex', label: 'Sexe (si pertinent)' },
  { name: 'origin', label: 'Origine' },
  { name: 'is_real_person', label: 'Personne réelle', type: 'checkbox' },
]
const APPEARANCE: Field[] = [
  { name: 'appearance', label: 'Apparence physique', type: 'textarea' },
  { name: 'skin_tone', label: 'Couleur de peau' },
  { name: 'hairstyle', label: 'Coiffure' },
  { name: 'height', label: 'Taille approximative' },
  { name: 'build', label: 'Morphologie' },
  { name: 'clothing', label: 'Vêtements', type: 'textarea' },
]
const PSYCHOLOGY: Field[] = [
  { name: 'personality', label: 'Personnalité', type: 'textarea' },
  { name: 'goals', label: 'Objectifs', type: 'textarea' },
  { name: 'fears', label: 'Peurs', type: 'textarea' },
  { name: 'strengths', label: 'Forces', type: 'textarea' },
  { name: 'weaknesses', label: 'Faiblesses', type: 'textarea' },
  { name: 'speech_style', label: 'Façon de parler', type: 'textarea' },
  { name: 'arc', label: 'Évolution au cours de la série', type: 'textarea' },
]
const HISTORY: Field[] = [
  { name: 'documented_details', label: 'Détails documentés (avec sources)', type: 'textarea' },
  { name: 'imagined_details', label: 'Détails imaginés pour la série', type: 'textarea' },
]
const CONTINUITY: Field[] = [
  { name: 'locked_description', label: 'Description visuelle de référence (figée)', type: 'textarea', rows: 4, help: 'Réutilisée telle quelle pour chaque génération d’image afin d’éviter les changements involontaires.' },
  { name: 'distinguishing_marks', label: 'Signes distinctifs', type: 'textarea' },
  { name: 'continuity_notes', label: 'Règles de continuité', type: 'textarea' },
]

export function Characters() {
  const { id } = useParams()
  return (
    <RequireProject title="Personnages">
      {(project) => (id ? <CharacterDetail project={project} id={Number(id)} /> : <CharacterList project={project} />)}
    </RequireProject>
  )
}

function CharacterList({ project }: { project: Project }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const list = useQuery({ queryKey: ['characters', project.id], queryFn: () => characters.list({ project: project.id }) })
  const create = useMutation({
    mutationFn: (d: Payload) => characters.create({ ...d, project: project.id }),
    onSuccess: (c) => { qc.invalidateQueries(); navigate(`/personnages/${c.id}`) },
  })
  return (
    <section className="card">
      <header className="page-header">
        <h2>Personnages ({list.data?.length ?? 0})</h2>
        {!creating && <button className="primary" onClick={() => setCreating(true)}>Nouveau personnage</button>}
      </header>
      {creating && <div className="subcard"><FieldForm fields={IDENTITY} submitLabel="Créer" error={create.error?.message} pending={create.isPending} onSubmit={(d) => create.mutate(d)} onCancel={() => setCreating(false)} columns /></div>}
      {list.data?.length === 0 && <p className="muted">Aucun personnage.</p>}
      <table className="table">
        <thead><tr><th>Code</th><th>Nom</th><th>Rôle</th><th>Type</th><th>Continuité visuelle</th></tr></thead>
        <tbody>
          {list.data?.map((c) => (
            <tr key={c.id}>
              <td className="code">{c.code}</td>
              <td><Link to={`/personnages/${c.id}`}>{c.name}</Link> <Swatches colors={c.color_palette} /></td>
              <td>{c.role_label}</td>
              <td>{c.is_real_person ? 'Personne réelle' : 'Fictif'}</td>
              <td>{c.continuity.complete ? <span className="tag cat-verified">Complète</span> : <span className="tag cat-hypothesis">Incomplète</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function CharacterDetail({ project, id }: { project: Project; id: number }) {
  const character = useQuery({ queryKey: ['character', id], queryFn: () => characters.get(id) })
  if (!character.data) return character.error ? <p className="error">{character.error.message}</p> : <p className="muted">Chargement…</p>
  return <CharacterSheet key={String(character.data.updated_at)} project={project} c={character.data} />
}

function CharacterSheet({ project, c }: { project: Project; c: Character }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [palette, setPalette] = useState<PaletteColor[]>(c.color_palette)
  const save = useMutation({ mutationFn: (d: Payload) => characters.update(c.id, d), onSuccess: () => qc.invalidateQueries() })
  const remove = useMutation({ mutationFn: () => characters.remove(c.id), onSuccess: () => { qc.invalidateQueries(); navigate('/personnages') } })
  const fields = [...IDENTITY, ...APPEARANCE, ...PSYCHOLOGY, ...(c.is_real_person ? HISTORY : []), ...CONTINUITY]
  const cont = c.continuity
  const viewLabel = (v: string) => REFERENCE_VIEWS.find((x) => x.value === v)?.label ?? v

  return (
    <>
      <p className="small"><Link to="/personnages">← Tous les personnages</Link></p>
      <section className="card">
        <h2><span className="code">{c.code}</span> {c.name} <Swatches colors={c.color_palette} /></h2>
        {c.is_real_person && <p className="banner warn">Personne réelle : séparez ce qui est documenté de ce qui est imaginé. Ses répliques seront marquées « reconstituées » sauf citation sourcée.</p>}
        <FieldForm fields={fields} initial={c as unknown as Payload} submitLabel="Enregistrer la fiche" pending={save.isPending} error={save.error?.message} onSubmit={(d) => save.mutate({ ...d, color_palette: palette })} columns />
        <PaletteEditor value={palette} onChange={setPalette} />
        <div className="actions"><button className="danger" onClick={() => window.confirm(`Supprimer ${c.name} ?`) && remove.mutate()}>Supprimer le personnage</button></div>
      </section>
      <section className="card">
        <h2>Fiche de continuité visuelle</h2>
        {cont.complete ? <p className="banner ok">Continuité complète : vues de face, profil, trois quarts, au moins trois expressions et description figée.</p> : (
          <ul className="small">
            {cont.missing_views.map((v) => <li key={v}>Manque : {viewLabel(v)}</li>)}
            {cont.missing_expressions > 0 && <li>Manque {cont.missing_expressions} expression(s) faciale(s)</li>}
            {!String(c.locked_description).trim() && <li>Manque la description visuelle de référence</li>}
          </ul>
        )}
        <ReferencePanel projectId={project.id} target={{ character: c.id }} />
      </section>
      <Relationships project={project} character={c} />
    </>
  )
}

function Relationships({ project, character }: { project: Project; character: Character }) {
  const qc = useQueryClient()
  const all = useQuery({ queryKey: ['relationships', project.id], queryFn: () => relationships.list({ project: project.id }) })
  const others = useQuery({ queryKey: ['characters', project.id], queryFn: () => characters.list({ project: project.id }) })
  const [formKey, setFormKey] = useState(0)
  const create = useMutation({
    mutationFn: (d: Payload) => relationships.create({ ...d, project: project.id, source: character.id }),
    onSuccess: () => { setFormKey((k) => k + 1); qc.invalidateQueries() },
  })
  const remove = useMutation({ mutationFn: relationships.remove, onSuccess: () => qc.invalidateQueries() })
  const mine = (all.data ?? []).filter((r) => r.source === character.id || r.target === character.id)
  const options = (others.data ?? []).filter((o) => o.id !== character.id).map((o) => ({ value: o.id, label: o.name }))

  return (
    <section className="card">
      <h2>Relations</h2>
      {mine.length === 0 && <p className="muted small">Aucune relation.</p>}
      <ul className="items">
        {mine.map((r) => (
          <li key={r.id} className="item-row">
            <span><strong>{r.source_name}</strong> → {r.kind} → <strong>{r.target_name}</strong>{r.description && <span className="muted"> · {r.description}</span>}</span>
            <button className="ghost" onClick={() => remove.mutate(r.id)}>Retirer</button>
          </li>
        ))}
      </ul>
      {options.length > 0 && (
        <FieldForm
          key={formKey}
          fields={[
            { name: 'kind', label: 'Relation (ex. : sœur de, rival de)', required: true },
            { name: 'target', label: 'Avec', type: 'select', options },
            { name: 'description', label: 'Description' },
          ]}
          submitLabel="Ajouter la relation"
          error={create.error?.message}
          onSubmit={(d) => create.mutate(d)}
          columns
        />
      )}
    </section>
  )
}
