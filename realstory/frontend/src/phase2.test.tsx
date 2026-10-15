import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ActiveProjectProvider } from './activeProject'
import { App } from './App'
import { SortableList } from './components/Sortable'

const project = { id: 7, title: 'La traversée', status: 'active', currency: 'EUR' }
const page = (results: unknown[]) => ({ count: results.length, results })

type Handler = (url: string, init?: RequestInit) => unknown

function mockApi(handler: Handler) {
  const calls: { url: string; method: string; body: unknown }[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null })
    const out = url.startsWith('/api/projects/?') || url === '/api/projects/' ? page([project]) : handler(url, init)
    if (out instanceof Response) return out
    return new Response(JSON.stringify(out ?? { count: 0, results: [] }), { status: 200 })
  })
  return calls
}

function renderAt(path: string, project: number | null = 7) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ActiveProjectProvider initial={project}>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </ActiveProjectProvider>
    </QueryClientProvider>,
  )
}


describe('Phase 2', () => {
  it('asks to choose a project before showing production sections', () => {
    mockApi(() => page([]))
    renderAt('/personnages', null)
    expect(screen.getByText(/Choisissez d’abord un projet/)).toBeInTheDocument()
  })

  it('validation sheet lists blocking issues and disables validation', async () => {
    mockApi((url) => {
      if (url === '/api/projects/7/') return project
      if (url.startsWith('/api/stories/7/validation-sheet/'))
        return {
          story: { title: 'Récit', summary: '', validated_at: null, validation_note: '' },
          facts_by_category: { verified: [], testimony: [{ id: 1, code: 'FAC-0001', statement: 'Départ en mars', sources: [] }], hypothesis: [], fiction: [] },
          sources: [],
          open_contradictions: [],
          issues: ['Le résumé de l’histoire est vide.'],
          can_validate: false,
        }
      return page([project])
    })
    renderAt('/histoires?onglet=validation')
    expect(await screen.findByText('Le résumé de l’histoire est vide.')).toBeInTheDocument()
    expect(screen.getByText(/Départ en mars/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Valider la fiche historique' })).toBeDisabled()
  })

  it('episodes cannot be created before the bible is validated', async () => {
    mockApi((url) => {
      if (url === '/api/projects/7/') return project
      if (url === '/api/bibles/7/') return { validated_at: null, seasons: 1, episodes_per_season: 6, issues: [] }
      return page([])
    })
    renderAt('/scenarios')
    expect(await screen.findByText(/La bible de série doit être validée/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nouvel épisode' })).toBeNull()
  })

  it('dialogue for a real person offers reconstructed or sourced quote', async () => {
    const scene = { id: 3, code: 'SCN-00003', heading: 'Le quai', episode: 9, characters: [], facts: [], lines: [], estimated_duration_s: 60, is_flashback: false, action: '', location_name: null, time_of_day: '', period: '', shot_count: 0 }
    const calls = mockApi((url, init) => {
      if (url === '/api/projects/7/') return project
      if (url === '/api/episodes/9/full/') return { episode: { id: 9, code: 'S01E01', title: 'Pilote', duration_s: 60, ending_type_label: 'Suspense' }, scenes: [scene], target_duration_s: 600, warnings: [] }
      if (url.startsWith('/api/characters/')) return page([{ id: 1, name: 'Awa', is_real_person: true }, { id: 2, name: 'Le douanier', is_real_person: false }])
      if (url.startsWith('/api/sources/')) return page([{ id: 5, title: 'Entretien 1998' }])
      if (url === '/api/lines/' && init?.method === 'POST') return { id: 1 }
      return page([])
    })
    renderAt('/scenarios/9')
    const select = await screen.findByLabelText('Personnage')
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3))

    await userEvent.selectOptions(select, '2')
    expect(screen.getByText(/sera marquée « Dialogue de fiction »/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Nature de la réplique')).toBeNull()

    await userEvent.selectOptions(select, '1')
    await userEvent.selectOptions(screen.getByLabelText('Nature de la réplique'), 'authentic')
    await userEvent.selectOptions(screen.getByLabelText('Source de la citation'), '5')
    await userEvent.type(screen.getByLabelText('Réplique'), 'Nous partirons à l’aube.')
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter la réplique' }))
    await waitFor(() => expect(calls.some((c) => c.url === '/api/lines/' && c.method === 'POST')).toBe(true))
    const post = calls.find((c) => c.url === '/api/lines/' && c.method === 'POST')!
    expect(post.body).toMatchObject({ scene: 3, character: 1, kind: 'authentic', source: 5 })
  })

  it('reorders items with the arrow buttons', async () => {
    const onReorder = vi.fn()
    render(
      <SortableList
        items={[{ id: 1 }, { id: 2 }, { id: 3 }]}
        onReorder={onReorder}
        label={(i) => `plan ${i.id}`}
        render={(i, controls) => <div>{controls} Plan {i.id}</div>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Monter plan 1' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Descendre plan 1' }))
    expect(onReorder).toHaveBeenCalledWith([2, 1, 3])
    await userEvent.click(screen.getByRole('button', { name: 'Monter plan 3' }))
    expect(onReorder).toHaveBeenLastCalledWith([1, 3, 2])
  })
})
