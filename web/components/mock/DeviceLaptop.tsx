import type { CSSProperties, ReactNode } from 'react'

// CSS laptop. The screen draws its children at a fixed design size and scales them to the frame with container units, so no JS is involved.
// tan(atan2(a, b)) is the unitless a / b. Hardware stays dark.
export function DeviceLaptop({ children, viewport = [1280, 800], className = '' }: { children: ReactNode; viewport?: [number, number]; className?: string }) {
  const [w, h] = viewport
  const inner: CSSProperties = { width: w, height: h, scale: `tan(atan2(100cqw, ${w}px))` }
  return (
    <div className={`mx-auto w-full ${className}`}>
      <div className="relative mx-[3%] border border-ink bg-ink px-[1.4%] pb-[1.2%] pt-[2.2%]">
        <span aria-hidden="true" className="absolute left-1/2 top-[0.8%] size-1.5 -translate-x-1/2 rounded-dot bg-ink-soft" />
        <div className="relative overflow-hidden bg-paper [container-type:inline-size]" style={{ aspectRatio: `${w} / ${h}` }}>
          <div className="absolute left-0 top-0 origin-top-left" style={inner}>
            {children}
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-3 border border-t-0 border-ink bg-ink-soft sm:h-4">
        <span className="absolute left-1/2 top-0 h-1.5 w-[14%] -translate-x-1/2 bg-ink" />
      </div>
    </div>
  )
}
