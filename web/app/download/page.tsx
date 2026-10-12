import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import fixture from '@/fixtures/demo.json'
import { examples } from '@/lib/demo/examples'
import { view } from '@/lib/demo/view'
import { byId } from '@/lib/numbers'
import { CMD_INSTALL, CMD_LIST, CMD_MCP } from '@/lib/mock/script'
import { site } from '@/site.config'
import { CopyBlock } from '@/components/CopyBlock'
import { DownloadButton } from '@/components/DownloadButton'
import { InstallMock } from '@/components/mock/InstallMock'
import { Section } from '@/components/Section'
import { CropMarks } from '@/components/retro/CropMarks'
import { Window } from '@/components/retro/Window'

export const metadata: Metadata = { title: 'Download', description: 'Install the Proton extension for VS Code on Windows x64 and connect it to Claude Code.' }

const HEADLINE = 'Download Proton'

const memory = byId('memory-extension')

const requirements = [
  { name: 'Computer', value: `${site.platform}, processor only` },
  { name: 'Editor', value: 'VS Code' },
  { name: 'Memory', value: `About ${memory.value} GB while running` },
  { name: 'Disk', value: 'Room for the model files, about 480 MB, downloaded on first start' },
]

const steps = [
  {
    title: 'Install the Extension',
    body: 'Run this in a terminal, or use Install from VSIX in the Extensions view. The Proton icon appears in the activity bar.',
    code: CMD_INSTALL,
  },
  {
    title: 'Add Proton to Claude Code',
    body: 'This tells Claude Code where the local server listens. Run it once.',
    code: CMD_MCP,
  },
  {
    title: 'Check It Works',
    body: 'The reply should show the server as connected.',
    code: CMD_LIST,
  },
]

export default function Download() {
  const rec = fixture.examples.find((e) => e.id === 'injection')!
  const prompt = examples.find((e) => e.id === 'injection')!.prompt
  const decision = { prompt, label: view('injection', rec.reply).headline, ms: rec.ms }

  return (
    <>
      <section className="mx-auto max-w-page px-4 pb-12 pt-10 md:px-6 md:pb-16 md:pt-16">
        <div className="relative px-3 py-7 md:px-6">
          <CropMarks />
          <h1 className="m-0 text-display tracking-display">
            {HEADLINE.split(' ').map((w, i) => (
              <span key={i}>
                <span className="rise-word" style={{ '--i': i } as CSSProperties}>
                  {w}
                </span>{' '}
              </span>
            ))}
          </h1>
        </div>
        <p className="lift-in m-0 mt-8 max-w-prose text-lead" style={{ '--d': '240ms' } as CSSProperties}>
          One extension for VS Code. It starts a small server on your computer and shows its status in the sidebar.
        </p>
        <p className="lift-in m-0 mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-title font-medium" style={{ '--d': '380ms' } as CSSProperties}>
          <DownloadButton />
          <span className="text-caption font-normal">
            Version {site.version} for {site.platform}.
          </span>
        </p>
      </section>

      <section aria-label="What the Install Looks Like" className="field">
        <div className="mx-auto max-w-page px-4 py-12 md:px-6 md:py-16">
          <div className="dotgrid border border-ink p-3 md:p-10">
            <InstallMock decision={decision} />
          </div>
          <p className="m-0 mt-4 max-w-prose text-caption">
            A sample screen. The states are the ones the extension shows, the percentages are illustrative, and the decision is a recorded reply with the median
            time of {fixture.runs} calls, recorded {fixture.recordedAt} on a busy desktop PC.
          </p>
        </div>
      </section>

      <Section title="Requirements" crop>
        <Window title="Your.Computer" className="max-w-3xl">
          <dl className="m-0">
            {requirements.map((r) => (
              <div key={r.name} className="grid gap-1 border-b border-ink px-4 py-3 last:border-b-0 sm:grid-cols-[9rem_1fr] sm:gap-4">
                <dt className="font-pixel text-pixel-lg">{r.name}</dt>
                <dd className="m-0 text-body">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Window>
      </Section>

      <Section title="Set Up" intro="Three commands. Each one is a window you can copy from." crop>
        <ol className="m-0 grid max-w-4xl list-none gap-8 p-0">
          {steps.map((s, i) => (
            <li key={s.title} className="min-w-0">
              <Window title={`Step ${i + 1} of ${steps.length}`} bodyClassName="p-4 md:p-6">
                <h3 className="m-0 font-pixel text-pixel-lg font-normal">{s.title}</h3>
                <p className="m-0 mt-2 max-w-prose text-body">{s.body}</p>
                <div className="mt-4">
                  <CopyBlock label="Terminal" code={s.code} />
                </div>
              </Window>
            </li>
          ))}
        </ol>
      </Section>
    </>
  )
}
