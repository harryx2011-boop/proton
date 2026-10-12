import type { ReactNode } from 'react'

export function PixelStat({ value, unit, children }: { value: ReactNode; unit?: string; children: ReactNode }) {
  return (
    <div className="border border-ink bg-paper p-3 shadow-window">
      <p className="m-0">
        <span className="inline-block bg-ink px-2 pb-0.5 pt-1 font-pixel text-pixel-xl text-paper">{value}</span>
        {unit ? <span className="ml-2 font-pixel text-pixel-lg">{unit}</span> : null}
      </p>
      <p className="m-0 mt-2 text-caption">{children}</p>
    </div>
  )
}
