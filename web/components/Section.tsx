import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

export function Section({ id, title, intro, children }: { id?: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <Reveal>
        <h2 className="max-w-prose text-heading font-semibold tracking-tight">{title}</h2>
        {intro && <p className="mt-4 max-w-prose text-lead text-fg-muted">{intro}</p>}
      </Reveal>
      <Reveal delay={0.06} className="mt-10">
        {children}
      </Reveal>
    </section>
  )
}
