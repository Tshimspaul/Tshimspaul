import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Project } from '../api/client'
import { bibles, type Payload } from '../api/resources'
import type { Bible as BibleT, PaletteColor } from '../api/types'
import { FieldForm, type Field } from '../components/FieldForm'
import { PaletteEditor, Swatches } from '../components/Palette'
import { RequireProject } from '../components/RequireProject'
import { formatDate } from '../format'

const FIELDS: Field[] = [
  { name: 'series_title', label: 'Titre de la série', required: true },
  { name: 'genre', label: 'Genre' },
  { name: 'target_audience', label: 'Public cible' },
  {
    name: 'episode_format', label: 'Format', type: 'select',
    options: [
      { value: 'short', label: 'Court : 3 à 5 min' },
      { value: 'medium', label: 'Intermédiaire : 8 à 12 min' },
      { value: 'long', label: 'Long : 20 à 30 min' },
    ],
  },
  { name: 'episode_duration_min', label: 'Durée d’un épisode (min)', type: 'number' },
  { name: 'seasons', label: 'Nombre de saisons', type: 'number' },
  { name: 'episodes_per_season', label: 'Épisodes par saison', type: 'number' },
  { name: 'main_theme', label: 'Thème principal', type: 'textarea' },
  { name: 'message', label: 'Message de la série', type: 'textarea' },
  { name: 'historical_context', label: 'Contexte historique', type: 'textarea', rows: 4 },
  { name: 'synopsis', label: 'Synopsis général', type: 'textarea', rows: 5 },
  { name: 'main_conflict', label: 'Conflit principal', type: 'textarea' },
  { name: 'stakes', label: 'Enjeux dramatiques', type: 'textarea' },
  { name: 'character_arcs', label: 'Évolution des personnages', type: 'textarea' },
  { name: 'visual_identity', label: 'Identité visuelle', type: 'textarea' },
  { name: 'animation_style', label: 'Style d’animation', type: 'textarea' },
  { name: 'sound_ambience', label: 'Ambiance sonore', type: 'textarea' },
]

export function Bible() {
  return <RequireProject title="Bible de série">{(project) => <BibleEditor project={project} />}</RequireProject>
}

function BibleEditor({ project }: { project: Project }) {
  const bible = useQuery({ queryKey: ['bible', project.id], queryFn: () => bibles.get(project.id) })
  if (!bible.data) return bible.error ? <p className="error">{bible.error.message}</p> : <p className="muted">Chargement…</p>
  return <BibleForm key={bible.data.updated_at as string} project={project} bible={bible.data} />
}

function BibleForm({ project, bible }: { project: Project; bible: BibleT }) {
  const qc = useQueryClient()
  const [palette, setPalette] = useState<PaletteColor[]>(bible.color_palette)
  const save = useMutation({ mutationFn: (d: Payload) => bibles.update(project.id, d), onSuccess: () => qc.invalidateQueries() })
  const validate = useMutation({ mutationFn: () => bibles.validate(project.id), onSuccess: () => qc.invalidateQueries() })
  const totalEpisodes = bible.seasons * bible.episodes_per_season

  return (
    <>
      <section className="card">
        {bible.validated_at ? (
          <p className="banner ok">Bible validée le {formatDate(bible.validated_at)}. L’écriture des épisodes est ouverte. Toute modification la repasse en brouillon.</p>
        ) : (
          <p className="banner warn">Bible en brouillon. Les épisodes ne peuvent pas être écrits avant sa validation.</p>
        )}
        <p className="small">
          {bible.series_title || 'Série sans titre'} · {bible.episode_format_label} · {bible.seasons} saison(s) × {bible.episodes_per_season} épisode(s)
          {' '}= {totalEpisodes} épisode(s) de {bible.episode_duration_min} min <Swatches colors={bible.color_palette} />
        </p>
        {bible.issues.length > 0 && (
          <>
            <h3>Avant validation</h3>
            <ul className="error small">{bible.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            {bible.issues.some((i) => i.includes('validation historique')) && <p className="small"><Link to="/histoires?onglet=validation">Ouvrir la fiche de validation historique</Link></p>}
          </>
        )}
        {validate.error && <p className="error" role="alert">{validate.error.message}</p>}
        {!bible.validated_at && (
          <button className="primary" disabled={bible.issues.length > 0 || validate.isPending} onClick={() => validate.mutate()}>Valider la bible</button>
        )}
      </section>
      <section className="card">
        <FieldForm
          fields={FIELDS}
          initial={bible as unknown as Payload}
          submitLabel="Enregistrer la bible"
          pending={save.isPending}
          error={save.error?.message}
          onSubmit={(d) => save.mutate({ ...d, color_palette: palette })}
          columns
        />
        <PaletteEditor value={palette} onChange={setPalette} />
        <p className="muted small">La palette est enregistrée avec le bouton « Enregistrer la bible ».</p>
      </section>
    </>
  )
}
