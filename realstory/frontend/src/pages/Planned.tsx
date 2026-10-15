import type { Section } from '../sections'

export function Planned({ section }: { section: Section }) {
  return (
    <>
      <header className="page-header">
        <h1>{section.label}</h1>
      </header>
      <section className="card">
        <p><strong>Prévu en phase {section.phase}.</strong> Cette section n’est pas encore fonctionnelle.</p>
        <p className="muted">{section.summary}</p>
      </section>
    </>
  )
}
