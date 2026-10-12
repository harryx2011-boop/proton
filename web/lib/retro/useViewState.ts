'use client'

import { useEffect, useState, type RefObject } from 'react'

export function useInView(ref: RefObject<Element | null>, amount = 0.35) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: amount })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, amount])
  return inView
}

export function useReducedMotion() {
  const [reduce, setReduce] = useState<boolean | null>(null)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setReduce(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduce
}
