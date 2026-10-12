'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import type { View } from '@/lib/demo/view'

export interface DemoItem {
  id: string
  title: string
  prompt: string
  ms: number
  json: string
  view: View
}

const TYPE_MS = 26
const HOLD_MS = 4400

export function Demo({ items }: { items: DemoItem[] }) {
  const reduce = useReducedMotion()
  const box = useRef<HTMLDivElement>(null)
  const inView = useInView(box, { amount: 0.35 })
  const [active, setActive] = useState(0)
  const [typed, setTyped] = useState(items[0].prompt.length)
  const [playing, setPlaying] = useState(true)
  const [hidden, setHidden] = useState(false)
  const item = items[active]
  const done = typed >= item.prompt.length
  const live = !reduce && playing && inView && !hidden

  useEffect(() => {
    const onVis = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const select = useCallback(
    (i: number) => {
      setActive(i)
      setTyped(reduce ? items[i].prompt.length : 0)
    },
    [items, reduce],
  )

  useEffect(() => {
    if (!live || done) return
    const t = setInterval(() => setTyped((n) => n + 1), TYPE_MS)
    return () => clearInterval(t)
  }, [live, done, active])

  useEffect(() => {
    if (!live || !done) return
    const t = setTimeout(() => select((active + 1) % items.length), HOLD_MS)
    return () => clearTimeout(t)
  }, [live, done, active, items.length, select])

  const shown = item.prompt.slice(0, typed)

  return (
    <div ref={box} className="rounded-panel border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-2">
        <div role="group" aria-label="Examples" className="flex flex-wrap gap-1">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              aria-pressed={i === active}
              onClick={() => select(i)}
              className={`min-h-11 rounded-control px-3 text-caption font-medium transition-colors duration-[var(--duration-control)] ease-standard ${
                i === active ? 'bg-raised text-accent' : 'text-fg-muted hover:bg-raised hover:text-fg'
              }`}
            >
              {it.title}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            className="min-h-11 min-w-20 rounded-control px-3 text-caption font-medium text-fg-muted transition-colors duration-[var(--duration-control)] hover:bg-raised hover:text-fg"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => select(active)}
            className="min-h-11 min-w-20 rounded-control px-3 text-caption font-medium text-fg-muted transition-colors duration-[var(--duration-control)] hover:bg-raised hover:text-fg"
          >
            Replay
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4 bg-surface p-4 md:p-6">
          <div>
            <h3 className="text-caption font-medium text-fg-muted">Request</h3>
            <div aria-live="off" className="mt-2 min-h-[8.5rem] whitespace-pre-wrap break-words rounded-control border border-line-strong bg-ground p-3 font-mono text-caption text-fg">
              {shown}
              {!done && <span aria-hidden="true" className="ml-px inline-block h-4 w-[2px] translate-y-0.5 bg-accent" />}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-caption font-medium text-fg-muted">Decision</h3>
              <span className="font-mono text-caption text-fg-muted">{done ? `${item.ms} ms` : ''}</span>
            </div>
            <p className="mt-2 min-h-8 text-title font-semibold tracking-tight">{done ? item.view.headline : ''}</p>
            <ul className="mt-3 flex min-h-[8.5rem] flex-col gap-2">
              {item.view.rows.map((r, i) => (
                <li key={`${item.id}-${i}`} className="grid grid-cols-[minmax(0,1fr)_3.25rem] items-center gap-x-3 gap-y-1">
                  <span className="truncate text-caption text-fg" title={r.label}>
                    {r.label}
                    {r.tag ? <span className="ml-2 font-medium text-accent">{r.tag}</span> : null}
                  </span>
                  <span className="text-right font-mono text-caption text-fg-muted">{done ? r.display : ''}</span>
                  <span className="col-span-2 h-1.5 overflow-hidden rounded-pill bg-raised" aria-hidden="true">
                    <span
                      className={`block h-full rounded-pill transition-[width] duration-[var(--duration-state)] ease-settle ${r.win ? 'bg-accent' : 'bg-line-strong'}`}
                      style={{ width: done ? `${Math.max(2, Math.round(r.bar * 100))}%` : '0%' }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 bg-surface p-4 md:p-6">
          <h3 className="text-caption font-medium text-fg-muted">Raw Reply</h3>
          <pre
            tabIndex={0}
            role="region"
            aria-label="Raw reply from Proton"
            className="mt-2 h-[22rem] overflow-auto rounded-control border border-line bg-ground p-3 font-mono text-caption text-fg"
          >
            {done ? item.json : ''}
          </pre>
        </div>
      </div>
    </div>
  )
}
