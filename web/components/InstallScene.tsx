'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import { Mark } from './Mark'

interface Props {
  decisionLabel: string
  decisionMs: number
  version: string
  address: string
}

// step 0: before, 1: installed, 2: server ready, 3: connected, 4: first decision
const FINAL = 4
const CUES = [500, 1700, 2900, 4100]

export function InstallScene({ decisionLabel, decisionMs, version, address }: Props) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const [step, setStep] = useState(FINAL)

  useEffect(() => {
    if (reduce === false) setStep(0)
  }, [reduce])

  useEffect(() => {
    if (reduce !== false || !inView) return
    const timers = CUES.map((ms, i) => setTimeout(() => setStep(i + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [reduce, inView])

  const pane = (active: boolean) =>
    `rounded-panel border bg-surface p-4 transition-colors duration-[var(--duration-state)] ease-standard ${active ? 'border-accent' : 'border-line'}`

  return (
    <div ref={ref} className="grid gap-4 md:grid-cols-3">
      <div className={pane(step === 0 || step === 1)}>
        <h3 className="text-caption font-medium text-fg-muted">Extensions</h3>
        <div className="mt-3 flex items-center gap-3 rounded-control bg-ground p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-raised text-accent">
            <Mark size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium">Proton</p>
            <p className="truncate font-mono text-caption text-fg-muted">{version}</p>
          </div>
          <span
            className={`inline-flex min-h-8 items-center rounded-control px-3 text-caption font-medium ${step >= 1 ? 'bg-raised text-fg' : 'bg-accent text-accent-ink'}`}
          >
            {step >= 1 ? 'Installed' : 'Install'}
          </span>
        </div>
      </div>

      <div className={pane(step === 2)}>
        <h3 className="text-caption font-medium text-fg-muted">Proton Sidebar</h3>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-control bg-ground p-3 text-caption">
          <dt className="text-fg-muted">Status</dt>
          <dd className={`font-medium ${step >= 2 ? 'text-accent' : 'text-fg-muted'}`}>{step >= 2 ? 'Ready' : step === 1 ? 'Starting' : 'Not Installed'}</dd>
          <dt className="text-fg-muted">Address</dt>
          <dd className="font-mono">{address}</dd>
          <dt className="text-fg-muted">Version</dt>
          <dd className="font-mono">{version}</dd>
        </dl>
      </div>

      <div className={pane(step >= 3)}>
        <h3 className="text-caption font-medium text-fg-muted">Claude Code</h3>
        <div className="mt-3 rounded-control bg-ground p-3 font-mono text-caption">
          <p className="text-fg">
            proton <span className={step >= 3 ? 'text-accent' : 'text-fg-muted'}>{step >= 3 ? 'Connected' : 'Not Connected'}</span>
          </p>
          <p className="mt-2 min-h-10 text-fg-muted">{step >= 4 ? `decide: ${decisionLabel}, ${decisionMs} ms` : ''}</p>
        </div>
      </div>
    </div>
  )
}
