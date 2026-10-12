'use client'

import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion'
import { Mark } from './Mark'

const steps = [
  { title: 'Your Agent', body: 'Sends a short question: a piece of text and the labels to choose from.' },
  { title: 'Proton', body: 'Compares the text with each label on your processor. No graphics card needed.' },
  { title: 'The Answer', body: 'A label with a score comes back in milliseconds, ready for the agent to act on.' },
]

function Link({ delay }: { delay: number }) {
  const reduce = useReducedMotion()
  return (
    <div aria-hidden="true" className="relative flex items-center justify-center md:w-16">
      <div className="h-8 w-px bg-line-strong md:h-px md:w-full" />
      {!reduce && (
        <m.span
          className="absolute h-2 w-2 rounded-pill bg-accent"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: [0, 1, 1, 0] }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.1, delay, ease: [0.4, 0, 0.2, 1] }}
        />
      )}
    </div>
  )
}

export function HowItWorks() {
  return (
    <LazyMotion features={domAnimation} strict>
    <div className="rounded-panel border border-dashed border-line-strong p-4 md:p-6">
      <div className="flex flex-col items-stretch md:flex-row md:items-center">
        {steps.map((s, i) => (
          <div key={s.title} className="contents">
            {i > 0 && <Link delay={0.35 * i} />}
            <div className="flex-1 rounded-panel border border-line bg-surface p-5">
              <div className="flex items-center gap-2 text-fg">
                {s.title === 'Proton' && <Mark size={18} />}
                <h3 className="text-body font-semibold tracking-tight">{s.title}</h3>
              </div>
              <p className="mt-2 text-caption text-fg-muted">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-caption text-fg-muted">All of this happens on your computer.</p>
    </div>
    </LazyMotion>
  )
}
