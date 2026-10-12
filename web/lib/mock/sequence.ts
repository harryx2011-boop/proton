'use client'

// Play-once hooks for dynamic mocks, adapted from the mockups skill (references/sequence.ts).
// Server HTML, no JavaScript and reduced motion all show the last step.
import { useEffect, useRef, useState } from 'react'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return reduced
}

/** `visible` is true while at least `threshold` of the element is on screen. */
export function useInView<T extends Element>(threshold = 0.4) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible }
}

/** Step i starts at `starts[i]` ms after the first time `visible` is true. Once begun, the script runs to its end. */
export function useBeats(starts: number[], visible: boolean): number {
  const reduced = usePrefersReducedMotion()
  const last = starts.length - 1
  const [step, setStep] = useState(last)
  const begun = useRef(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(window.clearTimeout), [])

  useEffect(() => {
    if (reduced) {
      timers.current.forEach(window.clearTimeout)
      setStep(last)
      return
    }
    if (!begun.current) setStep(0)
    if (!visible || begun.current) return
    begun.current = true
    timers.current = starts.slice(1).map((ms, i) => window.setTimeout(() => setStep(i + 1), ms))
    // starts is a module constant, read once when the script begins
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduced])

  return step
}
