import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

type Handler = (url: string, init?: RequestInit) => unknown

function mockApi(handler: Handler) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const body = handler(String(input), init)
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status: body === undefined ? 204 : 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const project = {
  id: 7, title: 'La traversée', description: '', status: 'draft', status_label: 'Brouillon',
  episode_format: 'medium', episode_format_label: 'Format intermédiaire (8 à 12 min)', aspect_ratio: '16:9',
  budget_limit: '10.00', currency: 'EUR', committed_cost: '0', created_at: '2026-10-15T08:00:00Z', updated_at: '2026-10-15T08:00:00Z',
}

const paidJob = {
  id: 3, project: 7, project_title: 'La traversée', kind: 'x', label: 'Image de test', status: 'needs_approval',
  status_label: 'Validation nécessaire', is_paid: true, estimated_cost: '4.0000', actual_cost: null, result: {},
  error: '', attempts: 0, created_at: '2026-10-15T08:00:00Z', finished_at: null,
}

describe('Interface', () => {
  it('shows all 15 sections in French and marks future phases', () => {
    mockApi(() => ({ projects: { total: 0, by_status: {} }, jobs: { pending: 0, running: 0, completed: 0, failed: 0, needs_approval: 0 }, recent_projects: [], recent_jobs: [] }))
    renderAt('/')
    const nav = screen.getByRole('navigation')
    expect(nav.querySelectorAll('a')).toHaveLength(15)
    expect(screen.getByRole('link', { name: /Génération vidéo/ })).toHaveTextContent('Phase 4')
  })

  it('dashboard displays counts for every job state', async () => {
    mockApi(() => ({
      projects: { total: 2, by_status: {} },
      jobs: { pending: 1, running: 0, completed: 5, failed: 2, needs_approval: 3 },
      recent_projects: [project],
      recent_jobs: [paidJob],
    }))
    renderAt('/')
    for (const label of ['En attente', 'En cours', 'Terminée', 'Échec', 'Validation nécessaire']) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0)
    }
    expect(screen.getByRole('link', { name: 'La traversée' })).toBeInTheDocument()
    expect(screen.getByText(/≈ 4,00/)).toBeInTheDocument()
  })

  it('planned sections say so instead of showing fake buttons', () => {
    mockApi(() => ({}))
    renderAt('/video')
    expect(screen.getByText('Prévu en phase 4.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('creates a project through the API', async () => {
    const calls: { url: string; init?: RequestInit }[] = []
    mockApi((url, init) => {
      calls.push({ url, init })
      if (url === '/api/projects/' && init?.method === 'POST') return { ...project, title: 'Nouveau' }
      if (url.startsWith('/api/projects/7/')) return { ...project, title: 'Nouveau' }
      if (url.startsWith('/api/jobs/')) return { count: 0, results: [] }
      return { count: 0, results: [] }
    })
    renderAt('/projets?nouveau=1')
    await userEvent.type(screen.getByLabelText('Titre du projet'), 'Nouveau')
    await userEvent.selectOptions(screen.getByLabelText('Format d’image'), '9:16')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }))

    const post = calls.find((c) => c.init?.method === 'POST')!
    expect(JSON.parse(String(post.init!.body))).toMatchObject({ title: 'Nouveau', aspect_ratio: '9:16', budget_limit: null })
    expect(await screen.findByRole('heading', { name: 'Nouveau' })).toBeInTheDocument()
  })

  it('approving a paid job calls the approve endpoint', async () => {
    const posts: string[] = []
    mockApi((url, init) => {
      if (init?.method === 'POST') { posts.push(url); return { ...paidJob, status: 'pending' } }
      if (url.startsWith('/api/projects/7/')) return project
      return { count: 1, results: [paidJob] }
    })
    renderAt('/projets/7')
    await userEvent.click(await screen.findByRole('button', { name: 'Approuver' }))
    await waitFor(() => expect(posts).toContain('/api/jobs/3/approve/'))
  })

  it('shows API validation errors to the user', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ title: ['Le titre est obligatoire.'] }), { status: 400 }),
    )
    renderAt('/projets?nouveau=1')
    await userEvent.type(screen.getByLabelText('Titre du projet'), ' ')
    await userEvent.click(screen.getByRole('button', { name: 'Créer le projet' }))
    expect(await screen.findAllByText('Le titre est obligatoire.')).not.toHaveLength(0)
  })
})
