import Link from 'next/link'
import { Mark } from './Mark'
import { nav } from '@/lib/nav'
import { site } from '@/site.config'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-12 md:flex-row md:justify-between md:px-6">
        <div className="max-w-sm">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Mark size={22} />
            <span>Proton</span>
          </div>
          <p className="mt-3 text-caption text-fg-muted">Fast local judgment for AI agents. Version {site.version} for {site.platform}.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-1">
            {[{ href: '/download', label: 'Download' }, ...nav, { href: '/#credits', label: 'Credits' }].map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="flex min-h-11 items-center text-caption text-fg-muted transition-colors duration-[var(--duration-control)] hover:text-fg">
                  {n.label}
                </Link>
              </li>
            ))}
            {site.repoPublic && (
              <li>
                <a href={site.repoUrl} className="flex min-h-11 items-center text-caption text-fg-muted transition-colors duration-[var(--duration-control)] hover:text-fg">
                  Source Code
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
