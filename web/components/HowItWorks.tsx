'use client'

import type { ReactNode } from 'react'
import { Window } from '@/components/retro/Window'
import { Check, Terminal } from '@/components/icons/generated'
import { useDraw, type DrawState } from '@/components/home/useDraw'
import { Mark } from './Mark'

const steps: { title: string; icon: ReactNode; body: string; sample: ReactNode }[] = [
  {
    title: 'Your Agent',
    icon: <Terminal />,
    body: 'Sends a short question: a piece of text and the labels to choose from.',
    sample: (
      <>
        text: &quot;Is this a bug or a feature?&quot;
        <br />
        labels: bug, feature
      </>
    ),
  },
  {
    title: 'Proton',
    icon: <Mark size={16} />,
    body: 'Compares the text with each label on your processor. No graphics card needed.',
    sample: (
      <span className="flex items-center justify-center py-1">
        <Mark size={36} />
      </span>
    ),
  },
  {
    title: 'The Answer',
    icon: <Check />,
    body: 'A label with a score comes back in milliseconds, ready for the agent to act on.',
    sample: <>label: feature</>,
  },
]

// A dotted line that draws left to right (top to bottom below md) with a small arrowhead at its end.
function Connector({ index, state }: { index: number; state: DrawState }) {
  const armed = state === 'armed'
  const move = armed ? 'transition-none' : 'transition-transform duration-[var(--duration-hero)] ease-settle'
  const delay = { transitionDelay: `${index * 700}ms` }
  return (
    <div aria-hidden="true" className="flex h-12 flex-col items-center justify-center md:h-auto md:w-16 md:flex-row">
      <span className={`block h-full w-0 origin-top border-l-4 border-dotted border-ink md:hidden ${move}`} style={{ ...delay, transform: armed ? 'scaleY(0)' : 'scaleY(1)' }} />
      <span className={`hidden h-0 w-full origin-left border-t-4 border-dotted border-ink md:block ${move}`} style={{ ...delay, transform: armed ? 'scaleX(0)' : 'scaleX(1)' }} />
      <svg
        viewBox="0 0 8 8"
        className={`size-3 shrink-0 rotate-90 fill-ink md:rotate-0 ${armed ? 'opacity-0' : 'opacity-100 transition-opacity duration-[var(--duration-control)]'}`}
        style={{ transitionDelay: `${index * 700 + 700}ms` }}
      >
        <path d="M0 0 8 4 0 8z" />
      </svg>
    </div>
  )
}

export function HowItWorks() {
  const { ref, state } = useDraw<HTMLDivElement>(0.3)
  return (
    <div ref={ref}>
      <div className="flex flex-col items-stretch md:flex-row md:items-center">
        {steps.map((s, i) => (
          <div key={s.title} className="contents">
            {i > 0 && <Connector index={i - 1} state={state} />}
            <Window title={s.title} icon={s.icon} className="min-w-0 flex-1 self-stretch" bodyClassName="flex h-full flex-col gap-4 p-4">
              <h3 className="m-0 font-pixel text-pixel-lg font-normal">{s.title}</h3>
              <p className="m-0 text-body">{s.body}</p>
              <p className="win-gray m-0 mt-auto border border-ink p-3 font-mono text-caption">{s.sample}</p>
            </Window>
          </div>
        ))}
      </div>
      <p className="m-0 mt-6 text-caption">All of this happens on your computer.</p>
    </div>
  )
}
