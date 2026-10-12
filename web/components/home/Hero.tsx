import Link from 'next/link'
import { CropMarks } from '@/components/retro/CropMarks'
import { MarginCode } from '@/components/retro/MarginCode'
import { DownloadButton } from '@/components/DownloadButton'
import { site } from '@/site.config'

const HEADLINE = 'Fast Local Judgment for AI Agents'

export function Hero() {
  return (
    <section className="sky -mt-11">
      <div className="relative mx-auto max-w-page px-4 pb-20 md:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/art/atom-halftone.svg"
          alt=""
          width={1280}
          height={420}
          fetchPriority="low"
          className="pointer-events-none absolute inset-x-4 top-11 w-[calc(100%-2rem)] select-none [mask-image:linear-gradient(to_bottom,#000_62%,transparent)] md:inset-x-6 md:w-[calc(100%-3rem)]"
        />
        <MarginCode className="absolute left-1 top-[28rem] max-h-[22rem] overflow-hidden" />

        <div className="relative pt-[clamp(11rem,29vw,24rem)] text-center">
          <div className="relative mx-auto max-w-[78rem] px-3 py-7 md:px-6">
            <CropMarks />
            <h1 className="m-0 text-display tracking-display">
              {HEADLINE.split(' ').map((w, i) => (
                <span key={i}>
                  <span className="rise-word" style={{ '--i': i } as React.CSSProperties}>
                    {w}
                  </span>{' '}
                </span>
              ))}
            </h1>
          </div>

          <p className="mx-auto mt-10 max-w-prose text-lead">
            Proton runs on your own computer and answers quick questions for an AI agent: is this text trying to give it hidden orders, which skill fits this
            task, is this action safe.
          </p>

          <p className="lift-in m-0 mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-title font-medium" style={{ '--d': '420ms' } as React.CSSProperties}>
            <DownloadButton />
            <Link href="/docs" className="flip biglink inline-flex min-h-11 items-center px-2">
              Read the Docs
            </Link>
          </p>
          <p className="lift-in m-0 mt-3 text-caption" style={{ '--d': '520ms' } as React.CSSProperties}>
            Version {site.version} for {site.platform} with VS Code. MIT licence.
          </p>
        </div>
      </div>
    </section>
  )
}
