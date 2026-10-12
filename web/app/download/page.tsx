import type { Metadata } from 'next'
import fixture from '@/fixtures/demo.json'
import { view } from '@/lib/demo/view'
import { site } from '@/site.config'
import { CopyBlock } from '@/components/CopyBlock'
import { DownloadButton } from '@/components/DownloadButton'
import { InstallScene } from '@/components/InstallScene'
import { Reveal } from '@/components/Reveal'

export const metadata: Metadata = { title: 'Download', description: 'Install the Proton extension for VS Code on Windows x64 and connect it to Claude Code.' }

const requirements = [
  { name: 'Computer', value: `${site.platform}, processor only` },
  { name: 'Editor', value: 'VS Code' },
  { name: 'Memory', value: 'About 0.68 GB while running' },
  { name: 'Disk', value: 'Room for the model files, about 0.5 GB, downloaded on first start' },
]

const steps = [
  {
    title: 'Install the Extension',
    body: 'Run this in a terminal, or use Install from VSIX in the Extensions view. The Proton icon appears in the activity bar.',
    label: 'Terminal',
    code: 'code --install-extension proton.vsix',
  },
  {
    title: 'Add Proton to Claude Code',
    body: 'This tells Claude Code where the local server listens. Run it once.',
    label: 'Terminal',
    code: `claude mcp add --transport http -s user proton ${site.mcpUrl}`,
  },
  {
    title: 'Check It Works',
    body: 'The reply should show the server as connected.',
    label: 'Terminal',
    code: 'claude mcp get proton',
  },
]

export default function Download() {
  const rec = fixture.examples.find((e) => e.id === 'injection')!
  const headline = view('injection', rec.reply).headline
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <Reveal>
        <h1 className="text-heading font-semibold tracking-tight">Download Proton</h1>
        <p className="mt-4 max-w-prose text-lead text-fg-muted">
          One extension for VS Code. It starts a small server on your computer and shows its status in the sidebar.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <DownloadButton />
          <p className="text-caption text-fg-muted">
            Version {site.version} for {site.platform}.
          </p>
        </div>
      </Reveal>

      <section className="mt-16" aria-labelledby="scene-title">
        <h2 id="scene-title" className="text-title font-semibold tracking-tight">What the Install Looks Like</h2>
        <div className="mt-6">
          <InstallScene decisionLabel={headline} decisionMs={rec.ms} version={site.version} address="127.0.0.1:9400" />
        </div>
      </section>

      <section className="mt-16" aria-labelledby="req-title">
        <h2 id="req-title" className="text-title font-semibold tracking-tight">Requirements</h2>
        <dl className="mt-6 grid max-w-3xl gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-[10rem_1fr]">
          {requirements.map((r) => (
            <div key={r.name} className="contents">
              <dt className="bg-surface px-4 py-3 text-caption text-fg-muted">{r.name}</dt>
              <dd className="bg-surface px-4 py-3 text-caption text-fg">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-16" aria-labelledby="steps-title">
        <h2 id="steps-title" className="text-title font-semibold tracking-tight">Set Up</h2>
        <ol className="mt-6 grid max-w-3xl grid-cols-1 gap-10">
          {steps.map((s) => (
            <li key={s.title} className="min-w-0">
              <h3 className="text-body font-semibold">{s.title}</h3>
              <p className="mt-1 text-body text-fg-muted">{s.body}</p>
              <div className="mt-3">
                <CopyBlock label={s.label} code={s.code} />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
