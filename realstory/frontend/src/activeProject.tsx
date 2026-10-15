import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const KEY = 'realstory.activeProject'

function load(): number | null {
  try {
    const v = Number(localStorage.getItem(KEY))
    return Number.isInteger(v) && v > 0 ? v : null
  } catch {
    return null
  }
}

interface Ctx {
  projectId: number | null
  setProjectId: (id: number | null) => void
}

const ActiveProject = createContext<Ctx>({ projectId: null, setProjectId: () => {} })

export function ActiveProjectProvider({ children, initial }: { children: ReactNode; initial?: number | null }) {
  const [projectId, setState] = useState<number | null>(initial !== undefined ? initial : load)
  const setProjectId = useCallback((id: number | null) => {
    setState(id)
    try {
      if (id) localStorage.setItem(KEY, String(id))
      else localStorage.removeItem(KEY)
    } catch {
      /* storage unavailable: keep the choice for this session only */
    }
  }, [])
  return <ActiveProject.Provider value={{ projectId, setProjectId }}>{children}</ActiveProject.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useActiveProject() {
  return useContext(ActiveProject)
}
