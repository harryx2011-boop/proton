import Link from 'next/link'
import fixture from '@/fixtures/demo.json'
import { examples } from '@/lib/demo/examples'
import { view } from '@/lib/demo/view'
import { Demo, type DemoItem } from '@/components/demo/Demo'
import { DownloadButton } from '@/components/DownloadButton'
import { HowItWorks } from '@/components/HowItWorks'
import { KeyNumbers } from '@/components/KeyNumbers'
import { ToolGrid } from '@/components/ToolGrid'
import { Credits } from '@/components/Credits'
import { Section } from '@/components/Section'
import { Reveal } from '@/components/Reveal'
import { site } from '@/site.config'

const items: DemoItem[] = examples.map((e) => {
  const rec = fixture.examples.find((x) => x.id === e.id)!
  return { id: e.id, title: e.title, prompt: e.prompt, ms: rec.ms, json: JSON.stringify(rec.reply, null, 2), view: view(e.id, rec.reply) }
})

export default function Home() {
  return (
    <>
      <section className="mx-auto max-w-page px-4 pb-8 pt-16 md:px-6 md:pt-24">
        <Reveal>
          <h1 className="max-w-4xl text-display font-semibold tracking-tight">Fast Local Judgment for AI Agents</h1>
          <p className="mt-6 max-w-prose text-lead text-fg-muted">
            Proton runs on your own computer and answers quick questions for an AI agent: is this text trying to give it hidden orders, which skill fits this
            task, is this action safe.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <DownloadButton />
            <Link
              href="/docs"
              className="inline-flex min-h-11 items-center rounded-control border border-line-strong px-5 text-body font-medium transition-[transform,background-color] duration-[var(--duration-control)] ease-standard hover:-translate-y-0.5 hover:bg-raised"
            >
              Read the Docs
            </Link>
          </div>
          <p className="mt-4 text-caption text-fg-muted">For {site.platform} with VS Code.</p>
        </Reveal>
      </section>

      <section id="demo" aria-labelledby="demo-title" className="mx-auto max-w-page px-4 pb-8 md:px-6">
        <h2 id="demo-title" className="sr-only">
          Recorded Sample
        </h2>
        <Demo items={items} />
        <p className="mt-4 max-w-prose text-caption text-fg-muted">
          Recorded sample: real replies from a Proton server, with the median time of {fixture.runs} calls, recorded {fixture.recordedAt} on a busy desktop PC.
        </p>
      </section>

      <Section id="how" title="How It Works" intro="An agent asks, Proton decides, and the agent gets a label it can act on. Nothing is sent over the internet.">
        <HowItWorks />
      </Section>

      <Section title="Fast, Small, and Local" intro="Proton does one narrow job, so it needs little: a processor, under a gigabyte of memory, and no graphics card.">
        <KeyNumbers />
      </Section>

      <Section title="Six Tools, One Server" intro="Each tool answers one kind of question. An agent calls them over a local address.">
        <ToolGrid />
      </Section>

      <Section title="Everything Stays on Your Computer" intro="Proton listens on 127.0.0.1, an address that only your computer can reach. Your text is never sent anywhere. The one download is the set of model files on first start.">
        <Link
          href="/faq"
          className="inline-flex min-h-11 items-center rounded-control border border-line-strong px-5 text-body font-medium transition-[transform,background-color] duration-[var(--duration-control)] ease-standard hover:-translate-y-0.5 hover:bg-raised"
        >
          Read the FAQ
        </Link>
      </Section>

      <Section id="credits" title="Credits" intro="Proton is built on three small open models. Each keeps its own licence.">
        <Credits />
      </Section>
    </>
  )
}
