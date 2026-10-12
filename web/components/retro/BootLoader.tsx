'use client'

import { useEffect, useState } from 'react'
import { bootProgress, shouldShowBoot } from '@/lib/retro/boot'
import { site } from '@/site.config'

const SEEN = 'proton-boot-seen'
const ART = '/art/atom-halftone.svg'
const STEPS = 3

// Real progress: fonts ready, hero art decoded, page load event. Shown only when loading is slow, once per session.
export function BootLoader() {
  const [show, setShow] = useState(false)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    let seen = false
    try {
      seen = sessionStorage.getItem(SEEN) === '1'
    } catch {}
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (seen || reduced) return

    const t0 = performance.now()
    let done = 0
    let finished = false
    const timers: ReturnType<typeof setTimeout>[] = []

    const finish = () => {
      if (finished) return
      finished = true
      try {
        sessionStorage.setItem(SEEN, '1')
      } catch {}
      timers.push(setTimeout(() => setShow(false), 220))
    }
    const step = () => {
      done += 1
      setPct(bootProgress(done, STEPS))
      if (done >= STEPS) finish()
    }

    document.fonts.ready.then(step, step)
    const img = new Image()
    img.src = ART
    img.decode().then(step, step)
    if (document.readyState === 'complete') step()
    else window.addEventListener('load', step, { once: true })

    timers.push(
      setTimeout(() => {
        if (shouldShowBoot({ elapsedMs: performance.now() - t0, seen: false, reduced: false, done: finished })) setShow(true)
      }, 250),
      setTimeout(finish, 3000),
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (!show) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShow(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show])

  if (!show) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center">
      <div className="win pointer-events-auto w-72" role="progressbar" aria-label="Loading Proton" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="win-bar">
          <span className="text-pixel">Proton {site.version}</span>
        </div>
        <div className="p-3">
          <p className="m-0 font-pixel text-pixel">Loading ...</p>
          <p className="m-0 font-pixel text-pixel">Fonts, Art, Page</p>
          <div className="mt-2 h-6 border border-ink bg-paper">
            <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
          </div>
          <p className="m-0 mt-1 flex justify-between font-pixel text-pixel">
            <span>{pct}%</span>
            <button type="button" onClick={() => setShow(false)} className="flip min-h-11 px-2">
              Skip
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
