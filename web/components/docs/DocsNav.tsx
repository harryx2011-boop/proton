'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Window } from '@/components/retro/Window'
import { ChevronDown } from '@/components/icons/generated'

export interface NavItem {
  id: string
  label: string
  icon?: ReactNode
}

// Sticky contents window from lg, a disclosure below. The row of the section nearest the top of the screen is flipped.
export function DocsNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0].id)
  const disclosure = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const seen = new Set<string>()
    const pick = () => {
      const first = items.find((i) => seen.has(i.id))
      if (first) setActive(first.id)
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) seen.add(e.target.id)
          else seen.delete(e.target.id)
        }
        pick()
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    for (const i of items) {
      const el = document.getElementById(i.id)
      if (el) io.observe(el)
    }
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) setActive(items[items.length - 1].id)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [items])

  const list = (
    <ul className="m-0 flex list-none flex-col p-0">
      {items.map((m) => (
        <li key={m.id}>
          <a
            href={`#${m.id}`}
            aria-current={active === m.id ? 'location' : undefined}
            onClick={() => {
              setActive(m.id)
              if (disclosure.current) disclosure.current.open = false
            }}
            className={`flip flex min-h-11 items-center gap-2 border-b border-ink px-3 text-caption font-medium ${active === m.id ? 'bg-ink text-paper' : ''}`}
          >
            {m.icon ? <span aria-hidden="true" className="inline-flex shrink-0">{m.icon}</span> : <span aria-hidden="true" className="inline-block size-4 shrink-0" />}
            <span className="min-w-0 truncate">{m.label}</span>
          </a>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <details ref={disclosure} className="win lg:hidden [&[open]_svg]:rotate-180">
        <summary className="win-bar min-h-11 cursor-pointer list-none text-pixel [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block size-3 shrink-0 border border-paper" />
          <span className="min-w-0 flex-1">On This Page</span>
          <ChevronDown size={20} className="shrink-0" />
        </summary>
        <nav aria-label="On this page">{list}</nav>
      </details>
      <div className="hidden lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:block lg:self-start">
        <Window title="Contents" bodyClassName="">
          <nav aria-label="On this page">{list}</nav>
        </Window>
      </div>
    </>
  )
}
