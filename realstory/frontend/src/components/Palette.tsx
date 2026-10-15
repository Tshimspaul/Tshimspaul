import type { PaletteColor } from '../api/types'

export function PaletteEditor({ value, onChange }: { value: PaletteColor[]; onChange: (v: PaletteColor[]) => void }) {
  const set = (i: number, patch: Partial<PaletteColor>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  return (
    <fieldset className="multi">
      <legend>Palette de couleurs</legend>
      {value.map((c, i) => (
        <div key={i} className="palette-row">
          <input type="color" aria-label={`Couleur ${i + 1}`} value={c.hex} onChange={(e) => set(i, { hex: e.target.value.toUpperCase() })} />
          <input aria-label={`Nom de la couleur ${i + 1}`} placeholder="Nom (ex. : ocre du désert)" value={c.name} onChange={(e) => set(i, { name: e.target.value })} />
          <code>{c.hex}</code>
          <button type="button" className="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))}>Retirer</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { name: '', hex: '#888888' }])}>Ajouter une couleur</button>
    </fieldset>
  )
}

export function Swatches({ colors }: { colors: PaletteColor[] }) {
  if (!colors.length) return null
  return (
    <span className="swatches">
      {colors.map((c, i) => <span key={i} className="swatch" style={{ background: c.hex }} title={`${c.name} ${c.hex}`} />)}
    </span>
  )
}
