import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import type { Project } from '../api/client'
import { contradictions, facts, sources, stories, type Payload } from '../api/resources'
import type { Fact, FactCategory, Source } from '../api/types'
import { FieldForm, type Field } from '../components/FieldForm'
import { RequireProject } from '../components/RequireProject'
import { useTab } from '../components/Tabs'
import { formatDate } from '../format'
import { FACT_CATEGORIES, SOURCE_KINDS } from '../labels'

const TABS = [
  { key: 'histoire', label: 'Histoire' },
  { key: 'sources', label: 'Sources' },
  { key: 'elements', label: 'Faits et éléments' },
  { key: 'contradictions', label: 'Contradictions' },
  { key: 'validation', label: 'Fiche de validation' },
]

export function Stories() {
  const [tab, bar] = useTab(TABS)
  return (
    <RequireProject title="Histoires et documents">
      {(project) => (
        <>
          {bar}
          {tab === 'histoire' && <StoryForm project={project} />}
          {tab === 'sources' && <Sources project={project} />}
          {tab === 'elements' && <Facts project={project} />}
          {tab === 'contradictions' && <Contradictions project={project} />}
          {tab === 'validation' && <ValidationSheetView project={project} />}
        </>
      )}
    </RequireProject>
  )
}

function ValidationBanner({ validatedAt }: { validatedAt: string | null }) {
  return validatedAt ? (
    <p className="banner ok">Fiche historique validée le {formatDate(validatedAt)}. Toute modification annulera cette validation.</p>
  ) : (
    <p className="banner warn">Fiche historique non validée. La production ne peut pas commencer avant sa validation.</p>
  )
}

const STORY_FIELDS: Field[] = [
  { name: 'title', label: 'Titre de l’histoire' },
  { name: 'period', label: 'Période historique' },
  { name: 'summary', label: 'Résumé', type: 'textarea', rows: 5 },
  { name: 'places', label: 'Pays et lieux concernés', type: 'textarea' },
  { name: 'must_keep', label: 'Événements à conserver absolument', type: 'textarea' },
  { name: 'may_dramatize', label: 'Éléments pouvant être dramatisés', type: 'textarea' },
  { name: 'strictly_historical', label: 'Éléments devant rester strictement historiques', type: 'textarea' },
]

function StoryForm({ project }: { project: Project }) {
  const qc = useQueryClient()
  const story = useQuery({ queryKey: ['story', project.id], queryFn: () => stories.get(project.id) })
  const save = useMutation({ mutationFn: (d: Payload) => stories.update(project.id, d), onSuccess: () => qc.invalidateQueries() })
  if (!story.data) return <p className="muted">Chargement…</p>
  return (
    <section className="card">
      <ValidationBanner validatedAt={story.data.validated_at} />
      {save.isSuccess && <p className="banner ok" role="status">Histoire enregistrée.</p>}
      <FieldForm
        key={story.data.validated_at ?? 'draft'}
        fields={STORY_FIELDS}
        initial={story.data as unknown as Payload}
        submitLabel="Enregistrer l’histoire"
        pending={save.isPending}
        error={save.error?.message}
        onSubmit={(d) => save.mutate(d)}
        columns
      />
    </section>
  )
}

function Sources({ project }: { project: Project }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['sources', project.id], queryFn: () => sources.list({ project: project.id }) })
  const [editing, setEditing] = useState<Source | null>(null)
  const create = useMutation({
    mutationFn: (form: FormData) => sources.upload(form),
    onSuccess: () => qc.invalidateQueries(),
  })
  const update = useMutation({
    mutationFn: (d: Payload) => sources.update(editing!.id, d),
    onSuccess: () => { setEditing(null); qc.invalidateQueries() },
  })
  const remove = useMutation({ mutationFn: sources.remove, onSuccess: () => qc.invalidateQueries() })

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    form.set('project', String(project.id))
    if (!(form.get('file') as File)?.size) form.delete('file')
    create.mutate(form, { onSuccess: () => (e.target as HTMLFormElement).reset() })
  }

  return (
    <>
      <section className="card">
        <h2>Ajouter une source</h2>
        <form className="form" onSubmit={submit}>
          <div className="grid-2">
            <label>Titre<input name="title" required /></label>
            <label>Type
              <select name="kind">{SOURCE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
            </label>
            <label>Auteur ou témoin<input name="author" /></label>
            <label>Date<input name="date" /></label>
            <label className="wide">Référence (cote, URL, ouvrage)<input name="reference" /></label>
            <label className="wide">Notes<textarea name="notes" rows={2} /></label>
            <label className="wide">Fichier (document, photographie, enregistrement)<input name="file" type="file" /></label>
          </div>
          {create.error && <p className="error" role="alert">{create.error.message}</p>}
          <div className="actions"><button className="primary" disabled={create.isPending}>Ajouter la source</button></div>
        </form>
      </section>
      <section className="card">
        <h2>Sources ({list.data?.length ?? 0})</h2>
        {remove.error && <p className="error" role="alert">{remove.error.message}</p>}
        {list.data?.length === 0 && <p className="muted">Aucune source.</p>}
        <ul className="items">
          {list.data?.map((s) => (
            <li key={s.id}>
              {editing?.id === s.id ? (
                <FieldForm
                  fields={[
                    { name: 'title', label: 'Titre', required: true },
                    { name: 'kind', label: 'Type', type: 'select', options: SOURCE_KINDS },
                    { name: 'author', label: 'Auteur ou témoin' },
                    { name: 'date', label: 'Date' },
                    { name: 'reference', label: 'Référence' },
                    { name: 'notes', label: 'Notes', type: 'textarea' },
                  ]}
                  initial={s as unknown as Payload}
                  submitLabel="Enregistrer"
                  error={update.error?.message}
                  onSubmit={(d) => update.mutate(d)}
                  onCancel={() => setEditing(null)}
                  columns
                />
              ) : (
                <div className="item-row">
                  <div>
                    <span className="code">{s.code}</span> <strong>{s.title}</strong> <span className="tag">{s.kind_label}</span>
                    <div className="muted small">
                      {[s.author, s.date, s.reference].filter(Boolean).join(' · ')}
                      {s.file && <> · <a href={s.file} target="_blank" rel="noreferrer">Ouvrir le fichier</a></>}
                    </div>
                    {s.notes && <p className="small">{s.notes}</p>}
                  </div>
                  <div className="actions">
                    <button onClick={() => setEditing(s)}>Modifier</button>
                    <button className="ghost" onClick={() => window.confirm(`Supprimer la source « ${s.title} » ?`) && remove.mutate(s.id)}>Supprimer</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function factFields(sourceList: Source[]): Field[] {
  return [
    { name: 'statement', label: 'Énoncé', type: 'textarea', required: true },
    { name: 'category', label: 'Catégorie', type: 'select', options: [...FACT_CATEGORIES] },
    {
      name: 'treatment', label: 'Traitement', type: 'select',
      options: [{ value: 'strict', label: 'Strictement historique' }, { value: 'dramatizable', label: 'Peut être dramatisé' }],
      help: 'Un élément fictif est toujours « peut être dramatisé ».',
    },
    { name: 'event_date', label: 'Date de l’événement' },
    { name: 'chronology', label: 'Ordre chronologique', type: 'number', help: 'Sert à vérifier l’ordre des scènes.' },
    { name: 'place', label: 'Lieu' },
    { name: 'people', label: 'Personnes concernées' },
    { name: 'must_keep', label: 'À conserver absolument', type: 'checkbox' },
    {
      name: 'sources', label: 'Sources', type: 'multiselect',
      options: sourceList.map((s) => ({ value: s.id, label: `${s.code} · ${s.title}` })),
      help: 'Obligatoire pour un fait vérifié.',
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ]
}

export function CategoryTag({ category, label }: { category: FactCategory; label: string }) {
  return <span className={`tag cat-${category}`}>{label}</span>
}

function Facts({ project }: { project: Project }) {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Fact | 'new' | null>(null)
  const list = useQuery({ queryKey: ['facts', project.id, filter], queryFn: () => facts.list({ project: project.id, category: filter }) })
  const srcs = useQuery({ queryKey: ['sources', project.id], queryFn: () => sources.list({ project: project.id }) })
  const save = useMutation({
    mutationFn: (d: Payload) => (editing === 'new' ? facts.create({ ...d, project: project.id }) : facts.update((editing as Fact).id, d)),
    onSuccess: () => { setEditing(null); qc.invalidateQueries() },
  })
  const remove = useMutation({ mutationFn: facts.remove, onSuccess: () => qc.invalidateQueries() })
  const sourceTitle = (id: number) => srcs.data?.find((s) => s.id === id)?.title ?? `#${id}`

  return (
    <section className="card">
      <header className="page-header">
        <h2>Faits et éléments de l’histoire</h2>
        {editing === null && <button className="primary" onClick={() => setEditing('new')}>Ajouter un élément</button>}
      </header>
      <p className="muted small">
        Chaque élément est classé : fait vérifié (avec source), témoignage non vérifié, hypothèse ou élément fictif ajouté
        pour le scénario. Un fait n’est jamais présenté comme établi sans source.
      </p>
      {editing === 'new' && (
        <div className="subcard">
          <FieldForm fields={factFields(srcs.data ?? [])} initial={{ category: 'testimony', chronology: 0 }} submitLabel="Ajouter" error={save.error?.message} pending={save.isPending} onSubmit={(d) => save.mutate(d)} onCancel={() => setEditing(null)} columns />
        </div>
      )}
      <label className="inline">
        Afficher
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Toutes les catégories</option>
          {FACT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </label>
      {list.data?.length === 0 && <p className="muted">Aucun élément.</p>}
      <ul className="items">
        {list.data?.map((f) => (
          <li key={f.id}>
            {editing !== 'new' && editing?.id === f.id ? (
              <FieldForm fields={factFields(srcs.data ?? [])} initial={f as unknown as Payload} submitLabel="Enregistrer" error={save.error?.message} pending={save.isPending} onSubmit={(d) => save.mutate(d)} onCancel={() => setEditing(null)} columns />
            ) : (
              <div className="item-row">
                <div>
                  <span className="code">{f.code}</span> <CategoryTag category={f.category} label={f.category_label} />{' '}
                  <span className="tag">{f.treatment_label}</span>
                  {f.must_keep && <span className="tag">À conserver</span>}
                  {f.open_contradictions.length > 0 && <span className="tag cat-conflict">Contradiction à valider</span>}
                  <p>{f.statement}</p>
                  <div className="muted small">
                    {[f.event_date, f.place, f.people].filter(Boolean).join(' · ')}
                    {f.sources.length > 0 && <> · Sources : {f.sources.map(sourceTitle).join(', ')}</>}
                  </div>
                </div>
                <div className="actions">
                  <button onClick={() => setEditing(f)}>Modifier</button>
                  <button className="ghost" onClick={() => window.confirm('Supprimer cet élément ?') && remove.mutate(f.id)}>Supprimer</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Contradictions({ project }: { project: Project }) {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['contradictions', project.id], queryFn: () => contradictions.list({ project: project.id }) })
  const allFacts = useQuery({ queryKey: ['facts', project.id, ''], queryFn: () => facts.list({ project: project.id }) })
  const [resolving, setResolving] = useState<number | null>(null)
  const [resolution, setResolution] = useState('')
  const [formKey, setFormKey] = useState(0)
  const done = () => qc.invalidateQueries()
  const create = useMutation({
    mutationFn: (d: Payload) => contradictions.create({ ...d, project: project.id }),
    onSuccess: () => { setFormKey((k) => k + 1); done() },
  })
  const resolve = useMutation({
    mutationFn: (id: number) => contradictions.post(id, 'resolve', { resolution }),
    onSuccess: () => { setResolving(null); setResolution(''); done() },
  })
  const factLabel = (id: number) => {
    const f = allFacts.data?.find((x) => x.id === id)
    return f ? `${f.code} · ${f.statement}` : `#${id}`
  }

  return (
    <>
      <section className="card">
        <h2>Signaler une contradiction</h2>
        <FieldForm
          key={formKey}
          fields={[
            { name: 'description', label: 'En quoi ces éléments se contredisent-ils ?', type: 'textarea', required: true },
            { name: 'facts', label: 'Éléments en conflit (au moins deux)', type: 'multiselect', options: (allFacts.data ?? []).map((f) => ({ value: f.id, label: `${f.code} · ${f.statement.slice(0, 90)}` })) },
          ]}
          submitLabel="Signaler"
          pending={create.isPending}
          error={create.error?.message}
          onSubmit={(d) => create.mutate(d)}
        />
      </section>
      <section className="card">
        <h2>Contradictions</h2>
        {list.data?.length === 0 && <p className="muted">Aucune contradiction signalée.</p>}
        <ul className="items">
          {list.data?.map((c) => (
            <li key={c.id}>
              <span className={`tag ${c.status === 'open' ? 'cat-conflict' : 'cat-verified'}`}>{c.status_label}</span>
              <p>{c.description}</p>
              <ul className="small">{c.facts.map((id) => <li key={id}>{factLabel(id)}</li>)}</ul>
              {c.status === 'resolved' ? (
                <p className="small"><strong>Décision :</strong> {c.resolution} <span className="muted">({formatDate(c.resolved_at)})</span></p>
              ) : resolving === c.id ? (
                <div className="form">
                  <label>Décision humaine<textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)} /></label>
                  {resolve.error && <p className="error" role="alert">{resolve.error.message}</p>}
                  <div className="actions">
                    <button className="primary" onClick={() => resolve.mutate(c.id)}>Enregistrer la décision</button>
                    <button onClick={() => setResolving(null)}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setResolving(c.id)}>Trancher</button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function ValidationSheetView({ project }: { project: Project }) {
  const qc = useQueryClient()
  const sheet = useQuery({ queryKey: ['sheet', project.id], queryFn: () => stories.sheet(project.id) })
  const [note, setNote] = useState('')
  const validate = useMutation({ mutationFn: () => stories.validate(project.id, note), onSuccess: () => qc.invalidateQueries() })
  if (!sheet.data) return <p className="muted">Chargement…</p>
  const s = sheet.data
  const sourceTitle = (id: number) => s.sources.find((x) => x.id === id)?.title ?? `#${id}`

  return (
    <section className="card sheet">
      <header className="page-header">
        <h2>Fiche de validation historique</h2>
        <button onClick={() => window.print()}>Imprimer</button>
      </header>
      <ValidationBanner validatedAt={s.story.validated_at} />
      <dl className="facts">
        <dt>Histoire</dt><dd>{s.story.title || '—'}</dd>
        <dt>Période</dt><dd>{s.story.period || '—'}</dd>
        <dt>Lieux</dt><dd>{s.story.places || '—'}</dd>
        <dt>Résumé</dt><dd>{s.story.summary || '—'}</dd>
        <dt>À conserver</dt><dd>{s.story.must_keep || '—'}</dd>
        <dt>Strictement historique</dt><dd>{s.story.strictly_historical || '—'}</dd>
        <dt>Peut être dramatisé</dt><dd>{s.story.may_dramatize || '—'}</dd>
      </dl>
      {FACT_CATEGORIES.map((c) => (
        <div key={c.value}>
          <h3><CategoryTag category={c.value} label={c.label} /> ({s.facts_by_category[c.value].length})</h3>
          {s.facts_by_category[c.value].length === 0 ? <p className="muted small">Aucun.</p> : (
            <ul className="small">
              {s.facts_by_category[c.value].map((f) => (
                <li key={f.id}>
                  <span className="code">{f.code}</span> {f.event_date && <strong>{f.event_date} — </strong>}{f.statement}
                  {f.sources.length > 0 && <span className="muted"> (sources : {f.sources.map(sourceTitle).join(', ')})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <h3>Points bloquants</h3>
      {s.issues.length === 0 ? <p className="small">Aucun.</p> : <ul className="error small">{s.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      {!s.story.validated_at && (
        <div className="form no-print">
          <label>Note de validation (qui a relu, avec quelles sources)<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {validate.error && <p className="error" role="alert">{validate.error.message}</p>}
          <div className="actions">
            <button className="primary" disabled={!s.can_validate || validate.isPending} onClick={() => validate.mutate()}>Valider la fiche historique</button>
          </div>
        </div>
      )}
      {s.story.validation_note && <p className="small"><strong>Note :</strong> {s.story.validation_note}</p>}
    </section>
  )
}
