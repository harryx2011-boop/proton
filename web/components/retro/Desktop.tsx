'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { arrowDelta, bringToFront, clampPosition, type Point } from '@/lib/retro/drag'

export interface DeskWindow {
  id: string
  title: string
  icon?: ReactNode
  /** horizontal and vertical place on the desktop, 0 to 1 */
  fx: number
  fy: number
  /** width in px from md up */
  w: number
  children: ReactNode
  bodyClassName?: string
}

const ZERO: Point = { x: 0, y: 0 }

// Windows overlap on wide screens and can be dragged, raised and moved with arrow keys. They stack in a column below md.
export function Desktop({ windows, height, className = '' }: { windows: DeskWindow[]; height: string; className?: string }) {
  const desk = useRef<HTMLDivElement>(null)
  const [bounds, setBounds] = useState({ w: 0, h: 0 })
  const [wide, setWide] = useState(false)
  const [offsets, setOffsets] = useState<Record<string, Point>>({})
  const [stack, setStack] = useState(() => windows.map((w) => w.id))
  const [dragging, setDragging] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const drag = useRef<{ id: string; sx: number; sy: number; start: Point } | null>(null)

  useEffect(() => {
    const el = desk.current
    if (!el) return
    const media = window.matchMedia('(min-width: 768px)')
    const measure = () => {
      setWide(media.matches)
      setBounds({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    media.addEventListener('change', measure)
    return () => {
      ro.disconnect()
      media.removeEventListener('change', measure)
    }
  }, [])

  // Windows pop in once, only when the desktop starts below the fold. Visible in server HTML and without motion.
  useEffect(() => {
    const el = desk.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return
    setHidden(true)
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHidden(false)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const base = useCallback(
    (w: DeskWindow): Point => ({ x: w.fx * Math.max(0, bounds.w - w.w), y: w.fy * bounds.h }),
    [bounds],
  )

  const moveTo = useCallback(
    (w: DeskWindow, el: HTMLElement, offset: Point) => {
      const b = base(w)
      const size = { w: el.offsetWidth, h: el.offsetHeight }
      const abs = clampPosition({ x: b.x + offset.x, y: b.y + offset.y }, size, bounds)
      setOffsets((o) => ({ ...o, [w.id]: { x: abs.x - b.x, y: abs.y - b.y } }))
    },
    [base, bounds],
  )

  const raise = (id: string) => setStack((s) => bringToFront(s, id))

  const onBarDown = (e: PointerEvent<HTMLDivElement>, w: DeskWindow) => {
    if (!wide || e.pointerType === 'touch' || e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: w.id, sx: e.clientX, sy: e.clientY, start: offsets[w.id] ?? ZERO }
    setDragging(w.id)
  }

  const onBarMove = (e: PointerEvent<HTMLDivElement>, w: DeskWindow) => {
    const d = drag.current
    if (!d || d.id !== w.id) return
    const el = e.currentTarget.closest<HTMLElement>('[data-window]')
    if (el) moveTo(w, el, { x: d.start.x + e.clientX - d.sx, y: d.start.y + e.clientY - d.sy })
  }

  const onBarUp = () => {
    drag.current = null
    setDragging(null)
  }

  const onBarKey = (e: KeyboardEvent<HTMLDivElement>, w: DeskWindow) => {
    if (!wide) return
    const delta = arrowDelta(e.key, e.shiftKey)
    if (!delta) return
    e.preventDefault()
    const el = e.currentTarget.closest<HTMLElement>('[data-window]')
    const cur = offsets[w.id] ?? ZERO
    if (el) moveTo(w, el, { x: cur.x + delta.x, y: cur.y + delta.y })
  }

  return (
    <div
      ref={desk}
      style={{ '--desk-h': height } as CSSProperties}
      className={`relative flex flex-col gap-6 md:block md:h-[var(--desk-h)] ${className}`}
    >
      {windows.map((w, i) => {
        const o = offsets[w.id] ?? ZERO
        const lifted = dragging === w.id
        return (
          <section
            key={w.id}
            data-window={w.id}
            aria-label={w.title}
            onPointerDown={() => raise(w.id)}
            style={
              {
                '--w': `${w.w}px`,
                '--fx': w.fx,
                '--fy': w.fy,
                zIndex: stack.indexOf(w.id) + 1,
                transform: `translate3d(${o.x}px, ${o.y}px, 0)`,
                animationDelay: `${i * 60}ms`,
              } as CSSProperties
            }
            className={`win w-full md:absolute md:left-[calc((100%-var(--w))*var(--fx))] md:top-[calc(var(--fy)*100%)] md:w-[var(--w)] ${
              lifted ? 'shadow-window-lift' : ''
            } ${hidden ? 'opacity-0' : 'pop-in'}`}
          >
            <div
              className={`win-bar ${wide ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
              tabIndex={wide ? 0 : undefined}
              role={wide ? 'group' : undefined}
              aria-roledescription={wide ? 'movable window' : undefined}
              aria-label={wide ? `${w.title}. Use the arrow keys to move this window.` : undefined}
              onPointerDown={(e) => onBarDown(e, w)}
              onPointerMove={(e) => onBarMove(e, w)}
              onPointerUp={onBarUp}
              onPointerCancel={onBarUp}
              onKeyDown={(e) => onBarKey(e, w)}
            >
              <span aria-hidden="true" className="inline-block size-3 shrink-0 border border-paper" />
              {w.icon ? <span aria-hidden="true" className="inline-flex shrink-0 items-center">{w.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate text-pixel">{w.title}</span>
            </div>
            <div className={w.bodyClassName}>{w.children}</div>
          </section>
        )
      })}
    </div>
  )
}
