import { downloadState, site } from '@/site.config'

const base =
  'inline-flex min-h-11 items-center justify-center rounded-control px-5 text-body font-medium transition-[transform,background-color] duration-[var(--duration-control)] ease-standard'

export function DownloadButton({ className = '' }: { className?: string }) {
  const state = downloadState(site)
  if (state.kind === 'available') {
    return (
      <a href={state.href} className={`${base} bg-accent text-accent-ink hover:-translate-y-0.5 ${className}`}>
        Download for Windows
      </a>
    )
  }
  return (
    <span role="status" className={`${base} cursor-default border border-line-strong bg-raised text-fg ${className}`}>
      Download Coming Soon
    </span>
  )
}
