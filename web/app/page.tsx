import Link from 'next/link'
import fixture from '@/fixtures/demo.json'
import { examples } from '@/lib/demo/examples'
import { view } from '@/lib/demo/view'
import { byId } from '@/lib/numbers'
import { Demo, type DemoItem } from '@/components/demo/Demo'
import { Hero } from '@/components/home/Hero'
import { Compare } from '@/components/home/Compare'
import { WorksWith } from '@/components/home/WorksWith'
import { ToolsDesktop } from '@/components/home/ToolsDesktop'
import { HowItWorks } from '@/components/HowItWorks'
import { Credits } from '@/components/Credits'
import { Privacy } from '@/components/home/Privacy'
import { Section } from '@/components/Section'
import { PixelStat } from '@/components/retro/PixelStat'
import { RuleBlock } from '@/components/retro/RuleBlock'
import { Gauge, ListChecks, Route, ShieldAlert } from '@/components/icons/generated'

const icons: Record<string, React.ReactNode> = {
  injection: <ShieldAlert />,
  routing: <Route />,
  risk: <Gauge />,
  triage: <ListChecks />,
}

const items: DemoItem[] = examples.map((e) => {
  const rec = fixture.examples.find((x) => x.id === e.id)!
  return { id: e.id, title: e.title, icon: icons[e.id], prompt: e.prompt, ms: rec.ms, json: JSON.stringify(rec.reply, null, 2), view: view(e.id, rec.reply) }
})

const stats = [
  { id: 'latency-decide', caption: 'Typical time for one decision' },
  { id: 'memory-extension', caption: 'Memory while running' },
  { id: 'routing-top3', caption: 'Tasks where the right skill was in the top three' },
]

export default function Home() {
  return (
    <>
      <Hero />

      <section id="demo" aria-labelledby="demo-title" className="field">
        <div className="mx-auto max-w-page px-4 py-16 md:px-6">
          <h2 id="demo-title" className="sr-only">
            Recorded Sample
          </h2>
          <div className="dotgrid border border-ink p-3 md:p-8">
            <Demo items={items} />
          </div>
          <p className="m-0 mt-4 max-w-prose text-caption">
            Recorded sample: real replies from a Proton server, with the median time of {fixture.runs} calls, recorded {fixture.recordedAt} on a busy desktop PC.
          </p>
        </div>
      </section>

      <Section title="A Label, Not a Paragraph" crop>
        <div className="grid gap-10 md:grid-cols-2">
          <RuleBlock>
            <p className="m-0 text-lead">
              Language models write text for people. Proton does something narrower: you give it a piece of text and a few labels, and it picks one, with a
              score. A program can act on that straight away.
            </p>
          </RuleBlock>
          <RuleBlock>
            <p className="m-0 text-lead">
              Three small models run on your processor, with no graphics card, no account and no network call for your text. That narrow job is why an answer takes tens of
              milliseconds.
            </p>
          </RuleBlock>
        </div>
        <dl className="m-0 mt-12 grid gap-6 md:grid-cols-3">
          {stats.map(({ id, caption }) => {
            const n = byId(id)
            return (
              <div key={id}>
                <dt className="sr-only">{caption}</dt>
                <dd className="m-0">
                  <PixelStat value={n.value} unit={n.unit}>
                    {caption}. Measured {n.measured}.
                  </PixelStat>
                </dd>
              </div>
            )
          })}
        </dl>
        <p className="m-0 mt-8">
          <Link href="/benchmarks" className="flip biglink inline-flex min-h-11 items-center px-1 text-title font-medium">
            See All Benchmarks
          </Link>
        </p>
      </Section>

      <Section title="Six Tools, One Server" intro="Each tool answers one kind of question. Drag the windows around: they are real links into the docs." crop>
        <ToolsDesktop />
      </Section>

      <Compare />

      <WorksWith />

      <Section id="how" title="How It Works" intro="An agent asks, Proton decides, and the agent gets a label it can act on. Nothing is sent over the internet.">
        <HowItWorks />
      </Section>

      <Section id="privacy" title="Your Text Stays on Your Computer" intro="Proton listens on one address that only your computer can reach.">
        <Privacy />
      </Section>

      <Section id="credits" title="Credits" intro="Proton is built on three small open models. Each keeps its own licence.">
        <Credits />
      </Section>
    </>
  )
}
