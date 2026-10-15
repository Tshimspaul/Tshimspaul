/** Sections with phase <= CURRENT_PHASE are functional. */
export const CURRENT_PHASE = 2

export interface Section {
  path: string
  label: string
  /** Development phase in which the section becomes functional. */
  phase: number
  summary: string
}

export const SECTIONS: Section[] = [
  { path: '/', label: 'Tableau de bord', phase: 1, summary: '' },
  { path: '/projets', label: 'Mes projets', phase: 1, summary: '' },
  { path: '/histoires', label: 'Histoires et documents', phase: 2, summary: 'Saisie de l’histoire réelle, sources, faits vérifiés, témoignages, hypothèses, contradictions et fiche de validation historique.' },
  { path: '/bible', label: 'Bible de série', phase: 2, summary: 'Genre, public, thèmes, synopsis, identité visuelle, formats et validation avant toute génération massive.' },
  { path: '/personnages', label: 'Personnages', phase: 2, summary: 'Fiches détaillées, continuité visuelle, distinction entre éléments documentés et imaginés.' },
  { path: '/decors', label: 'Décors', phase: 2, summary: 'Lieux et accessoires avec identifiants stables.' },
  { path: '/scenarios', label: 'Scénarios', phase: 2, summary: 'Épisodes, scènes, dialogues (reconstitués clairement signalés), indications de caméra et de son.' },
  { path: '/storyboards', label: 'Storyboards', phase: 2, summary: 'Plans avec cadrage, angle, mouvement, durée, réorganisables par glisser-déposer.' },
  { path: '/images', label: 'Génération d’images', phase: 3, summary: 'Adaptateurs de fournisseurs, références versionnées, estimation des coûts et cache.' },
  { path: '/video', label: 'Génération vidéo', phase: 4, summary: 'Animation 2D/3D, image vers vidéo, IA, relance plan par plan.' },
  { path: '/audio', label: 'Voix et audio', phase: 5, summary: 'Identités vocales autorisées, import audio, effets, musique sous licence, synchronisation labiale.' },
  { path: '/montage', label: 'Montage', phase: 6, summary: 'Assemblage FFmpeg, transitions, sous-titres, génériques, corrections manuelles.' },
  { path: '/episodes', label: 'Épisodes', phase: 6, summary: 'Suivi des épisodes montés.' },
  { path: '/export', label: 'Exportation', phase: 6, summary: 'MP4 en 16:9, 9:16 ou 1:1, en 720p, 1080p ou 4K.' },
  { path: '/parametres', label: 'Paramètres', phase: 3, summary: 'Fournisseurs externes, tarifs relevés et préférences. Les clés API restent dans les variables d’environnement.' },
]
