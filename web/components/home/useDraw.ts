'use client'

import { useEffect, useRef, useState } from 'react'

export type DrawState = 'ready' | 'armed' | 'drawn'

// 'ready' is the server and no-motion state: the finished picture. 'armed' collapses it, only when the element starts below the fold,
// and 'drawn' plays it forward once the element scrolls into view.
export function useDraw<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null)
  const [state, setState] = useState<DrawState>('ready')

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.7) return
    setState('armed')
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState('drawn')
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])

  return { ref, state }
}
