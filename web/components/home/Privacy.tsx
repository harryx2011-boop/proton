'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Window } from '@/components/retro/Window'
import { Lock } from '@/components/icons/generated'
import { useDraw } from '@/components/home/useDraw'

// The finished diagram is the server state. When it starts below the fold, the packet crosses once, then the second line draws and stops at the boundary.
export function Privacy() {
  const { ref, state } = useDraw<HTMLDivElement>(0.4)
  const armed = state === 'armed'
  const drawn = state === 'drawn'
  const settle = (delay: number, what: string): CSSProperties => (armed ? { transition: 'none' } : { transition: what, transitionDelay: `${delay}ms` })

  return (
    <Window title="Local.Only" icon={<Lock />} bodyClassName="grid items-center gap-6 p-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-10 md:p-8">
      <div ref={ref}>
        <svg viewBox="0 0 520 230" role="img" aria-labelledby="local-title local-desc" className="block h-auto w-full">
          <title id="local-title">Where a request can go</title>
          <desc id="local-desc">
            An agent sends a request to Proton. Both sit inside a boundary labelled 127.0.0.1. A line from Proton toward the internet stops at the boundary.
          </desc>
          <rect x="16" y="16" width="320" height="198" className="fill-none stroke-ink" strokeWidth="2" strokeDasharray="8 6" />
          <text x="30" y="46" className="fill-ink font-pixel" fontSize="26">
            127.0.0.1
          </text>

          <rect x="36" y="90" width="84" height="64" className="fill-paper stroke-ink" strokeWidth="2" />
          <text x="78" y="130" textAnchor="middle" className="fill-ink font-pixel" fontSize="26">
            Agent
          </text>
          <rect x="204" y="90" width="84" height="64" className="fill-ink stroke-ink" strokeWidth="2" />
          <text x="246" y="130" textAnchor="middle" className="fill-paper font-pixel" fontSize="26">
            Proton
          </text>

          <line x1="120" y1="122" x2="196" y2="122" className="stroke-ink" strokeWidth="2" />
          <path d="M196 115 206 122 196 129z" className="fill-ink" />
          {state !== 'ready' && (
            <rect
              x="124"
              y="117"
              width="10"
              height="10"
              className="fill-ink"
              style={{
                transform: drawn ? 'translateX(60px)' : 'translateX(0)',
                opacity: drawn ? 0 : 1,
                transition: armed ? 'none' : 'transform 800ms var(--ease-standard), opacity 120ms linear 800ms',
              }}
            />
          )}

          <path
            d="M288 122H330"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={armed ? 1 : 0}
            className="fill-none stroke-ink"
            strokeWidth="2"
            style={settle(900, 'stroke-dashoffset 600ms var(--ease-standard)')}
          />
          <g style={{ opacity: armed ? 0 : 1, ...settle(1500, 'opacity 120ms linear') }}>
            <path d="M334 104V140" className="stroke-ink" strokeWidth="6" />
            <text x="328" y="178" textAnchor="end" className="fill-ink font-pixel" fontSize="20">
              Blocked
            </text>
          </g>

          <rect x="392" y="90" width="120" height="64" className="fill-well stroke-ink" strokeWidth="2" strokeDasharray="4 4" />
          <text x="452" y="128" textAnchor="middle" className="fill-ink font-pixel" fontSize="20">
            The Internet
          </text>
        </svg>
      </div>

      <div>
        <h3 className="m-0 font-pixel text-pixel-lg font-normal">Loopback Only</h3>
        <p className="m-0 mt-3 text-body">
          Proton answers on 127.0.0.1, an address that only your computer can reach. Your text goes from the agent to Proton and stops there.
        </p>
        <p className="m-0 mt-3 text-body">The one download is the model files, fetched on first start. After that Proton needs no network.</p>
        <p className="m-0 mt-4">
          <Link href="/faq#privacy" className="flip biglink inline-flex min-h-11 items-center px-1 text-body font-medium">
            Read the Privacy Answer
          </Link>
        </p>
      </div>
    </Window>
  )
}
