'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from '@/components/icons/generated'

export interface AccordionItem {
  id: string
  question: string
  answer: string
}

// Every answer is in the server HTML. A closed panel is collapsed with grid rows (0fr to 1fr), so the height animates without measuring.
export function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<string[]>(() => [items[0].id])

  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (items.some((i) => i.id === id)) setOpen((o) => (o.includes(id) ? o : [...o, id]))
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [items])

  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))

  return (
    <div className="flex flex-col gap-4">
      {items.map((f) => {
        const isOpen = open.includes(f.id)
        return (
          <section key={f.id} id={f.id} className="win">
            <h2 className="m-0 font-normal">
              <button
                type="button"
                id={`${f.id}-question`}
                aria-expanded={isOpen}
                aria-controls={`${f.id}-answer`}
                onClick={() => toggle(f.id)}
                data-tone="dark"
                className="win-bar flip min-h-11 w-full cursor-pointer py-1 text-left"
              >
                <span aria-hidden="true" className="inline-block size-3 shrink-0 border border-paper" />
                <span className="min-w-0 flex-1 text-pixel">{f.question}</span>
                <ChevronDown size={20} className={`shrink-0 transition-transform duration-[var(--duration-control)] ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </h2>
            <div
              id={`${f.id}-answer`}
              role="region"
              aria-labelledby={`${f.id}-question`}
              className={`faq-panel grid transition-[grid-template-rows,visibility] duration-[var(--duration-state)] ease-settle ${isOpen ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="m-0 max-w-prose p-4 text-body md:p-6">{f.answer}</p>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
