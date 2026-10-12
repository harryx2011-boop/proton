'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Mark } from './Mark'
import { nav } from '@/lib/nav'

const tile = 'flip flex min-h-11 items-center border border-ink px-3 text-body font-medium'
const light = 'bg-paper text-ink'
const dark = 'bg-ink text-paper'

export function Header() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const tone = (href: string) => (path === href ? dark : light)

  return (
    <header className="sticky top-0 z-40">
      <div className="flex items-start justify-between gap-2">
        <Link href="/" className={`${tile} ${light} gap-2`} onClick={() => setOpen(false)}>
          <Mark size={22} />
          <span>Proton</span>
        </Link>

        <nav aria-label="Main" className="hidden md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`${tile} -ml-px ${tone(n.href)}`} data-tone={path === n.href ? 'dark' : undefined} aria-current={path === n.href ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex">
          <Link href="/download" data-tone="dark" className={`${tile} ${dark} hidden md:flex`}>
            Download
          </Link>
          <button type="button" className={`${tile} ${light} md:hidden`} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="win m-2 md:hidden">
          <div className="win-bar">
            <span className="text-pixel">Menu</span>
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {[...nav, { href: '/download', label: 'Download' }].map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`flip flex min-h-11 items-center border-t border-ink px-3 text-body first:border-t-0 ${path === n.href ? dark : ''}`}
                  onClick={() => setOpen(false)}
                  aria-current={path === n.href ? 'page' : undefined}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
