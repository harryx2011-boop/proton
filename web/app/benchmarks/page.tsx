import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { Window } from '@/components/retro/Window'
import { CropMarks } from '@/components/retro/CropMarks'
import { RetroChart } from '@/components/retro/RetroChart'
import { CircleAlert } from '@/components/icons/generated'
import { availableCharts, missingCharts } from '@/lib/bench/resolve'

export const metadata: Metadata = {
  title: 'Benchmarks',
  description: 'Measured speed, memory, skill routing accuracy and hidden-instruction scores for Proton, with the date, test and machine for every chart.',
}

const HEADING = 'Benchmarks'

export default function Benchmarks() {
  const shown = availableCharts()
  const missing = missingCharts()
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-24">
      <div className="relative px-3 py-7 md:px-6">
        <CropMarks />
        <h1 className="m-0 text-heading tracking-heading">
          {HEADING.split(' ').map((w, i) => (
            <span key={i} className="rise-word" style={{ '--i': i } as CSSProperties}>
              {w}
            </span>
          ))}
        </h1>
        <p className="lift-in m-0 mt-5 max-w-prose text-lead" style={{ '--d': '260ms' } as CSSProperties}>
          Every number here was measured on one desktop PC and comes with its date, its test and a source. They show what Proton does on that machine, not a promise for yours.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-2">
        {shown.map((c) => (
          <RetroChart key={c.id} chart={c} as="h2" />
        ))}
      </div>

      <div className="mt-6">
        <Window title="Not-Measured.txt" icon={<CircleAlert />} bodyClassName="p-4 md:p-5">
          <h2 className="m-0 font-pixel text-pixel-lg font-normal">Not Measured Yet</h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0 text-body">
            {missing.map((c) => (
              <li key={c.id}>
                <strong className="font-medium">{c.title}:</strong> Not measured yet: needs {c.needs ?? 'another measurement'}.
              </li>
            ))}
            <li>
              <strong className="font-medium">Hosted language models:</strong> We did not run any, so this page makes no comparison with them.
            </li>
            <li>
              <strong className="font-medium">Other computers:</strong> Every figure comes from one desktop PC. A faster or slower machine will give other numbers.
            </li>
          </ul>
        </Window>
      </div>
    </div>
  )
}
