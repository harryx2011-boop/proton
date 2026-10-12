'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useInView, useReducedMotion } from 'framer-motion'
import type { View } from '@/lib/demo/view'
import { Mark } from '@/components/Mark'

export interface DemoItem {
  id: string
  title: string
  icon: ReactNode
  prompt: string
  ms: number
  json: string
  view: View
}

const TYPE_MS = 26
const HOLD_MS = 4400
const COUNT_MS = 420

// Counts to the real recorded time once the decision lands. The final value is always the recorded one.
function useCountUp(target: number, run: boolean, reduce: boolean | null) {
  const [n, setN] = useState(target)
  useEffect(() => {
    if (!run || reduce) {
      setN(target)
      return
    }
    setN(0)
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNT_MS)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run, reduce])
  return n
}

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
  const ms = useCountUp(item.ms, done && live, reduce)

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
    <div ref={box} role="group" aria-label="Proton demo" className="win">
      <div className="win-bar">
        <span aria-hidden="true" className="inline-block size-3 shrink-0 border border-paper" />
        <Mark size={16} />
        <span className="min-w-0 flex-1 truncate text-pixel">Proton.Demo</span>
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={!playing} className="flip -my-2 min-h-11 min-w-16 px-3 text-pixel">
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => select(active)} className="flip -my-2 min-h-11 min-w-16 px-3 text-pixel">
          Replay
        </button>
      </div>

      <div role="group" aria-label="Examples" className="flex flex-wrap border-b border-ink">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            aria-pressed={i === active}
            onClick={() => select(i)}
            className="flip flex min-h-11 items-center gap-2 border-r border-ink px-3 text-caption font-medium"
          >
            {it.icon}
            {it.title}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-5 border-b border-ink p-4 md:border-b-0 md:border-r md:p-6">
          <div>
            <h3 className="m-0 font-pixel text-pixel-lg font-normal">Request</h3>
            <div aria-live="off" className="win-gray mt-2 min-h-[8.5rem] whitespace-pre-wrap break-words border border-ink p-3 font-mono text-caption">
              {shown}
              {!done && <span aria-hidden="true" className="caret ml-px inline-block h-4 w-2 translate-y-0.5 bg-ink" />}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <h3 className="m-0 font-pixel text-pixel-lg font-normal">Decision</h3>
              <span className="font-pixel text-pixel-lg" aria-label={done ? `${item.ms} milliseconds` : undefined}>
                {done ? `${ms} ms` : ''}
              </span>
            </div>
            <p className="m-0 mt-2 min-h-10 text-title font-medium tracking-heading">{done ? item.view.headline : ''}</p>
            <ul className="m-0 mt-3 flex min-h-[8.5rem] list-none flex-col gap-3 p-0">
              {item.view.rows.map((r, i) => (
                <li key={`${item.id}-${i}`} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-end gap-x-3 gap-y-1">
                  <span className="truncate text-caption" title={r.label}>
                    {r.label}
                    {r.tag ? <span className="ml-2 bg-ink px-1 font-pixel text-pixel text-paper">{r.tag}</span> : null}
                  </span>
                  <span className="text-right font-pixel text-pixel">{done ? r.display : ''}</span>
                  <span aria-hidden="true" className="col-span-2 block h-4 overflow-hidden border border-ink bg-paper">
                    <span
                      className={`block h-full origin-left transition-transform duration-[var(--duration-state)] ease-settle ${r.win ? 'bg-ink' : 'dotgrid'}`}
                      style={{ transform: `scaleX(${done ? Math.max(0.02, r.bar) : 0})`, transitionDelay: done ? `${i * 60}ms` : '0ms' }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="min-w-0 p-4 md:p-6">
          <h3 className="m-0 font-pixel text-pixel-lg font-normal">Raw Reply</h3>
          <pre
            tabIndex={0}
            role="region"
            aria-label="Raw reply from Proton"
            className="m-0 mt-2 h-[22rem] overflow-auto border border-ink bg-paper p-3 font-mono text-caption"
          >
            {done ? item.json : ''}
          </pre>
        </div>
      </div>
    </div>
  )
}
