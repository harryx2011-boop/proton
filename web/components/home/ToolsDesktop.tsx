import Link from 'next/link'
import { Desktop, type DeskWindow } from '@/components/retro/Desktop'
import { ArrowUpDown, Files, GitFork, Gauge, ListChecks, Route } from '@/components/icons/generated'
import { tools } from '@/lib/docs/tools'

const layout: Record<string, { icon: React.ReactNode; fx: number; fy: number; w: number }> = {
  decide: { icon: <GitFork />, fx: 0.02, fy: 0.03, w: 380 },
  decide_batch: { icon: <Files />, fx: 0.36, fy: 0.2, w: 340 },
  locate_skill: { icon: <Route />, fx: 0.72, fy: 0.02, w: 360 },
  rank: { icon: <ArrowUpDown />, fx: 0.03, fy: 0.55, w: 330 },
  triage: { icon: <ListChecks />, fx: 0.44, fy: 0.58, w: 340 },
  risk: { icon: <Gauge />, fx: 0.92, fy: 0.44, w: 330 },
}

const windows: DeskWindow[] = tools.map((t) => {
  const l = layout[t.name]
  const sig = `${t.name}(${t.args.filter((a) => !a.optional).map((a) => a.name).join(', ')})`
  return {
    id: t.name,
    title: `${t.title}.tool`,
    icon: l.icon,
    fx: l.fx,
    fy: l.fy,
    w: l.w,
    bodyClassName: 'p-4',
    children: (
      <>
        <p className="m-0 text-body">{t.summary}</p>
        <p className="win-gray m-0 mt-3 border border-ink px-2 py-1 font-mono text-caption">{sig}</p>
        <p className="m-0 mt-3">
          <Link href={`/docs#${t.name}`} className="flip biglink inline-flex min-h-11 items-center px-1 text-body font-medium">
            Open in the Docs
          </Link>
        </p>
      </>
    ),
  }
})

export function ToolsDesktop() {
  return (
    <div className="dotgrid border border-ink bg-field p-3 md:p-6">
      <Desktop windows={windows} height="40rem" />
    </div>
  )
}
