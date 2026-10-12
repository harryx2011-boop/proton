import { downloadState, site } from '@/site.config'
import { BrandMark } from '@/components/BrandMark'

export function DownloadButton({ className = '' }: { className?: string }) {
  const state = downloadState(site)
  if (state.kind === 'available') {
    return (
      <a href={state.href} className={`flip biglink inline-flex min-h-11 items-center gap-2 px-2 ${className}`}>
        <BrandMark slug="windows" size={24} />
        Download for Windows
      </a>
    )
  }
  return (
    <span role="status" className={`inline-flex min-h-11 items-center gap-2 border border-ink bg-paper px-3 font-pixel text-pixel-lg shadow-window ${className}`}>
      <BrandMark slug="windows" size={24} />
      Download Coming Soon
    </span>
  )
}
