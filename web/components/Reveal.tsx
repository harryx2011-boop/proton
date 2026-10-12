'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Visible in the server HTML. Only blocks that start below the fold are hidden, after hydration, and fade in once seen.
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'show' | 'hide' | 'shown'>('show')

  useEffect(() => {
    const el = ref.current
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (calm || !el || el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setState('hide')
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('shown')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -60px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: state === 'shown' ? `${delay}s` : undefined }}
      className={`${className} transition-[opacity,transform] duration-[var(--duration-state)] ease-settle ${state === 'hide' ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}
    >
      {children}
    </div>
  )
}
