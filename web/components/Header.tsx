'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Mark } from './Mark'
import { nav } from '@/lib/nav'

export function Header() {
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const link = (href: string) =>
    `flex min-h-11 items-center rounded-control px-3 text-body transition-colors duration-[var(--duration-control)] ease-standard hover:bg-raised ${
      path === href ? 'text-accent' : 'text-fg-muted hover:text-fg'
    }`

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-control font-semibold tracking-tight" onClick={() => setOpen(false)}>
          <Mark size={24} />
          <span>Proton</span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={link(n.href)} aria-current={path === n.href ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
          <Link
            href="/download"
            className="ml-2 inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-body font-medium text-accent-ink transition-transform duration-[var(--duration-control)] ease-standard hover:-translate-y-0.5"
          >
            Download
          </Link>
        </nav>

        <button
          type="button"
          className="min-h-11 rounded-control px-3 text-body font-medium text-fg md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-ground px-4 pb-4 pt-2 md:hidden">
          <ul className="flex flex-col">
            {[...nav, { href: '/download', label: 'Download' }].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className={link(n.href)} onClick={() => setOpen(false)} aria-current={path === n.href ? 'page' : undefined}>
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
