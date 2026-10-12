import { credits } from '@/lib/credits'

export function Credits() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {credits.map((c) => (
        <li key={c.name} className="rounded-panel border border-line bg-surface p-5">
          <h3 className="font-mono text-body font-medium">{c.name}</h3>
          <p className="mt-1 text-caption text-fg-muted">By {c.by}</p>
          <p className="mt-3 text-caption text-fg">{c.use}</p>
          <a
            href={c.href}
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center text-caption font-medium text-accent underline underline-offset-4"
          >
            Model Page
          </a>
        </li>
      ))}
    </ul>
  )
}
