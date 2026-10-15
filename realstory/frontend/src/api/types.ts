export interface Story {
  id: number
  project: number
  title: string
  summary: string
  period: string
  places: string
  must_keep: string
  may_dramatize: string
  strictly_historical: string
  validated_at: string | null
  validation_note: string
}

export interface Source {
  id: number
  code: string
  project: number
  kind: string
  kind_label: string
  title: string
  author: string
  date: string
  reference: string
  notes: string
  file: string | null
}

export type FactCategory = 'verified' | 'testimony' | 'hypothesis' | 'fiction'

export interface Fact {
  id: number
  code: string
  project: number
  statement: string
  category: FactCategory
  category_label: string
  treatment: 'strict' | 'dramatizable'
  treatment_label: string
  must_keep: boolean
  event_date: string
  chronology: number
  place: string
  people: string
  sources: number[]
  notes: string
  open_contradictions: number[]
}

export interface Contradiction {
  id: number
  project: number
  description: string
  facts: number[]
  status: 'open' | 'resolved'
  status_label: string
  resolution: string
  resolved_at: string | null
}

export interface ValidationSheet {
  story: Story
  facts_by_category: Record<FactCategory, Fact[]>
  sources: Source[]
  open_contradictions: Contradiction[]
  issues: string[]
  can_validate: boolean
}

export interface PaletteColor {
  name: string
  hex: string
}

export interface Bible {
  id: number
  project: number
  series_title: string
  genre: string
  target_audience: string
  main_theme: string
  message: string
  historical_context: string
  synopsis: string
  main_conflict: string
  stakes: string
  character_arcs: string
  visual_identity: string
  animation_style: string
  color_palette: PaletteColor[]
  sound_ambience: string
  episode_format: 'short' | 'medium' | 'long'
  episode_format_label: string
  seasons: number
  episodes_per_season: number
  episode_duration_min: number
  validated_at: string | null
  updated_at: string
  issues: string[]
}

export interface Continuity {
  views: string[]
  expressions: string[]
  missing_views: string[]
  missing_expressions: number
  complete: boolean
}

export interface Character {
  id: number
  code: string
  project: number
  name: string
  role: 'main' | 'secondary' | 'minor'
  role_label: string
  is_real_person: boolean
  locked_description: string
  color_palette: PaletteColor[]
  continuity: Continuity
  [field: string]: unknown
}

export interface Relationship {
  id: number
  project: number
  source: number
  source_name: string
  target: number
  target_name: string
  kind: string
  description: string
}

export interface Location {
  id: number
  code: string
  project: number
  name: string
  setting: string
  setting_label: string
  description: string
  is_real_place: boolean
  [field: string]: unknown
}

export interface Prop {
  id: number
  code: string
  project: number
  name: string
  description: string
  owner: number | null
  owner_name: string | null
  [field: string]: unknown
}

export interface Reference {
  id: number
  code: string
  project: number
  character: number | null
  location: number | null
  prop: number | null
  target_code: string
  view: string
  view_label: string
  expression: string
  image: string
  version: number
  is_current: boolean
  origin: string
  notes: string
  created_at: string
}

export interface Episode {
  id: number
  code: string
  project: number
  season: number
  number: number
  title: string
  summary: string
  ending_type: string
  ending_type_label: string
  scene_count: number
  duration_s: number
  [field: string]: unknown
}

export interface Line {
  id: number
  scene: number
  order: number
  character: number
  character_name: string
  text: string
  parenthetical: string
  kind: 'authentic' | 'reconstructed' | 'fiction'
  kind_label: string
  source: number | null
}

export interface Scene {
  id: number
  code: string
  episode: number
  order: number
  heading: string
  location: number | null
  location_name: string | null
  time_of_day: string
  period: string
  characters: number[]
  action: string
  emotions: string
  camera_notes: string
  sound_notes: string
  music_notes: string
  estimated_duration_s: number
  facts: number[]
  is_flashback: boolean
  lines: Line[]
  shot_count: number
}

export interface EpisodeFull {
  episode: Episode
  scenes: Scene[]
  target_duration_s: number | null
  warnings: string[]
}

export interface Shot {
  id: number
  code: string
  scene: number
  order: number
  description: string
  main_character: number | null
  main_character_name: string | null
  action: string
  shot_type: string
  shot_type_label: string
  camera_angle: string
  camera_angle_label: string
  camera_movement: string
  camera_movement_label: string
  duration_s: string
  dialogue: string
  sound_effects: string
  lighting: string
  references: number[]
  reference_notes: string
}
