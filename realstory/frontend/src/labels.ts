import type { JobStatus } from './api/client'

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'En attente',
  running: 'En cours',
  completed: 'Terminée',
  failed: 'Échec',
  needs_approval: 'Validation nécessaire',
}

export const FACT_CATEGORIES = [
  { value: 'verified', label: 'Fait vérifié' },
  { value: 'testimony', label: 'Témoignage non vérifié' },
  { value: 'hypothesis', label: 'Hypothèse' },
  { value: 'fiction', label: 'Élément fictif ajouté' },
] as const

export const SOURCE_KINDS = [
  { value: 'document', label: 'Document de référence' },
  { value: 'photo', label: 'Photographie' },
  { value: 'testimony', label: 'Témoignage' },
  { value: 'archive', label: 'Archive' },
  { value: 'other', label: 'Autre' },
]

export const REFERENCE_VIEWS = [
  { value: 'face', label: 'Vue de face' },
  { value: 'profile', label: 'Vue de profil' },
  { value: 'three_quarter', label: 'Vue de trois quarts' },
  { value: 'back', label: 'Vue de dos' },
  { value: 'full_body', label: 'Pied' },
  { value: 'expression', label: 'Expression faciale' },
  { value: 'detail', label: 'Détail' },
  { value: 'other', label: 'Autre' },
]

export const SHOT_TYPES = [
  { value: 'wide', label: 'Plan général' },
  { value: 'medium', label: 'Plan moyen' },
  { value: 'close_up', label: 'Gros plan' },
  { value: 'extreme_close_up', label: 'Très gros plan' },
  { value: 'pov', label: 'Plan subjectif' },
  { value: 'tracking', label: 'Travelling' },
  { value: 'pan', label: 'Panoramique' },
  { value: 'transition', label: 'Plan de transition' },
]

export const CAMERA_ANGLES = [
  { value: 'eye_level', label: 'À hauteur d’yeux' },
  { value: 'high', label: 'Plongée' },
  { value: 'low', label: 'Contre-plongée' },
  { value: 'overhead', label: 'Vue aérienne' },
  { value: 'dutch', label: 'Cadre penché' },
]

export const CAMERA_MOVES = [
  { value: 'static', label: 'Fixe' },
  { value: 'tracking', label: 'Travelling' },
  { value: 'pan', label: 'Panoramique' },
  { value: 'tilt', label: 'Bascule' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'crane', label: 'Grue' },
  { value: 'handheld', label: 'Caméra à l’épaule' },
]

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return m ? `${m} min ${String(s).padStart(2, '0')} s` : `${s} s`
}
