import { useSearchParams } from 'react-router-dom'

export function useTab(tabs: { key: string; label: string }[]) {
  const [params, setParams] = useSearchParams()
  const current = tabs.find((t) => t.key === params.get('onglet'))?.key ?? tabs[0].key
  const bar = (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={t.key === current}
          className={t.key === current ? 'tab active' : 'tab'}
          onClick={() => setParams((p) => { p.set('onglet', t.key); return p })}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
  return [current, bar] as const
}
