import { request, type Page } from './client'
import type {
  Bible, Character, Contradiction, EpisodeFull, Episode, Fact, Line, Location, Prop, Reference,
  Relationship, Scene, Shot, Source, Story, ValidationSheet,
} from './types'

type Params = Record<string, string | number | undefined>
export type Payload = Record<string, unknown>

function query(params: Params) {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  const s = q.toString()
  return s ? `?${s}` : ''
}

const json = (data: unknown) => JSON.stringify(data)

function resource<T>(name: string) {
  return {
    list: (params: Params) => request<Page<T>>(`/${name}/${query(params)}`).then((p) => p.results),
    get: (id: number) => request<T>(`/${name}/${id}/`),
    create: (data: Payload) => request<T>(`/${name}/`, { method: 'POST', body: json(data) }),
    update: (id: number, data: Payload) => request<T>(`/${name}/${id}/`, { method: 'PATCH', body: json(data) }),
    remove: (id: number) => request<void>(`/${name}/${id}/`, { method: 'DELETE' }),
    post: <R = unknown>(id: number, action: string, data: Payload = {}) =>
      request<R>(`/${name}/${id}/${action}/`, { method: 'POST', body: json(data) }),
  }
}

export const sources = {
  ...resource<Source>('sources'),
  upload: (form: FormData) => request<Source>('/sources/', { method: 'POST', body: form }),
}
export const facts = resource<Fact>('facts')
export const contradictions = resource<Contradiction>('contradictions')
export const characters = resource<Character>('characters')
export const relationships = resource<Relationship>('relationships')
export const locations = resource<Location>('locations')
export const props = resource<Prop>('props')
export const episodes = {
  ...resource<Episode>('episodes'),
  full: (id: number) => request<EpisodeFull>(`/episodes/${id}/full/`),
}
export const scenes = resource<Scene>('scenes')
export const lines = resource<Line>('lines')
export const shots = resource<Shot>('shots')
export const references = {
  ...resource<Reference>('references'),
  upload: (form: FormData) => request<Reference>('/references/', { method: 'POST', body: form }),
  replace: (id: number, form: FormData) => request<Reference>(`/references/${id}/replace/`, { method: 'POST', body: form }),
}

export const stories = {
  get: (project: number) => request<Story>(`/stories/${project}/`),
  update: (project: number, data: Payload) => request<Story>(`/stories/${project}/`, { method: 'PATCH', body: json(data) }),
  sheet: (project: number) => request<ValidationSheet>(`/stories/${project}/validation-sheet/`),
  validate: (project: number, note: string) =>
    request<Story>(`/stories/${project}/validate/`, { method: 'POST', body: json({ note }) }),
}

export const bibles = {
  get: (project: number) => request<Bible>(`/bibles/${project}/`),
  update: (project: number, data: Payload) => request<Bible>(`/bibles/${project}/`, { method: 'PATCH', body: json(data) }),
  validate: (project: number) => request<Bible>(`/bibles/${project}/validate/`, { method: 'POST' }),
}
