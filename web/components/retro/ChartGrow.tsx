'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// The server HTML and the no-JavaScript page show every bar at full length. With motion allowed, bars drop to zero after
// hydration and grow once the chart is seen; children read the state through the group/plot data-g attribute.
export function ChartGrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'show' | 'hide'>('show')

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setState('hide')
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        raf = requestAnimationFrame(() => setState('show'))
        io.disconnect()
      },
      { rootMargin: '0px 0px -12% 0px' },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} data-g={state} className={`group/plot ${className}`}>
      {children}
    </div>
  )
}
