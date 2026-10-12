import Link from 'next/link'
import { Mark } from './Mark'
import { Window } from './retro/Window'
import { nav } from '@/lib/nav'
import { site } from '@/site.config'

export function Footer() {
  const links = [{ href: '/download', label: 'Download' }, ...nav, { href: '/#credits', label: 'Credits' }]
  return (
    <footer className="mx-auto max-w-page px-4 pb-10 pt-24 md:px-6">
      <Window title="Proton" icon={<Mark size={16} />} className="max-w-xl" bodyClassName="p-4">
        <p className="m-0 font-pixel text-pixel-lg">
          Version {site.version}
          <br />
          For {site.platform}. MIT licence.
        </p>
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-1 p-0">
          {links.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="flip biglink flex min-h-11 items-center px-1 text-body">
                {n.label}
              </Link>
            </li>
          ))}
          {site.repoPublic && (
            <li>
              <a href={site.repoUrl} className="flip biglink flex min-h-11 items-center px-1 text-body">
                Source Code
              </a>
            </li>
          )}
        </ul>
      </Window>
    </footer>
  )
}
