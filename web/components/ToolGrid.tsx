import Link from 'next/link'
import { tools } from '@/lib/docs/tools'

export function ToolGrid() {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tools.map((t) => (
        <li key={t.name}>
          <Link
            href={`/docs#${t.name}`}
            className="flex h-full min-h-11 flex-col rounded-panel border border-line bg-surface p-5 transition-[transform,background-color,border-color] duration-[var(--duration-control)] ease-standard hover:-translate-y-0.5 hover:border-line-strong hover:bg-raised"
          >
            <h3 className="text-body font-semibold tracking-tight">{t.title}</h3>
            <p className="mt-2 text-caption text-fg-muted">{t.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
