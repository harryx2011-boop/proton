import type { Metadata } from 'next'
import { tools } from '@/lib/docs/tools'
import { credits } from '@/lib/credits'
import { site } from '@/site.config'
import { CopyBlock } from '@/components/CopyBlock'

export const metadata: Metadata = { title: 'Tools and Docs', description: 'The six Proton tools: what each one does, its arguments, an example call and a real reply.' }

const menu = [{ id: 'overview', label: 'Overview' }, ...tools.map((t) => ({ id: t.name, label: t.title })), { id: 'clients', label: 'Clients' }, { id: 'models', label: 'Models' }]

const pythonClient = `from proton_client import Proton

p = Proton()
p.decide("Is this a bug or a feature?", {"kind": ["bug", "feature"]})`

const tsClient = `import { Proton } from './proton.ts'

const p = await Proton.connect()
await p.decide('Is this a bug or a feature?', { kind: ['bug', 'feature'] })`

function SideMenu({ className = '' }: { className?: string }) {
  return (
    <ul className={`flex flex-col ${className}`}>
      {menu.map((m) => (
        <li key={m.id}>
          <a href={`#${m.id}`} className="flex min-h-11 items-center rounded-control px-3 text-caption text-fg-muted transition-colors duration-[var(--duration-control)] hover:bg-raised hover:text-fg">
            {m.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default function Docs() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <h1 className="text-heading font-semibold tracking-tight">Tools and Docs</h1>
      <p className="mt-4 max-w-prose text-lead text-fg-muted">Proton is a server with six tools. Any program that speaks MCP, the standard way agents call tools, can use them.</p>

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center rounded-control border border-line px-3 text-body font-medium">On This Page</summary>
            <nav aria-label="On this page" className="mt-2 rounded-panel border border-line bg-surface p-2">
              <SideMenu />
            </nav>
          </details>
          <nav aria-label="On this page" className="hidden lg:block">
            <SideMenu />
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl">
          <section id="overview">
            <h2 className="text-title font-semibold tracking-tight">Overview</h2>
            <p className="mt-3 text-body text-fg-muted">
              The server listens on {site.mcpUrl}. Add it to Claude Code once and every session can call the tools.
            </p>
            <div className="mt-4">
              <CopyBlock label="Add to Claude Code" code={`claude mcp add --transport http -s user proton ${site.mcpUrl}`} />
            </div>
            <p className="mt-4 text-body text-fg-muted">
              Every reply on this page is a real reply from a running Proton server. Scores are comparisons, not probabilities, unless a tool says otherwise.
            </p>
          </section>

          {tools.map((t) => (
            <section key={t.name} id={t.name} className="mt-14 border-t border-line pt-10">
              <h2 className="text-title font-semibold tracking-tight">{t.title}</h2>
              <p className="mt-1 font-mono text-caption text-fg-muted">{t.name}</p>
              <p className="mt-4 text-body text-fg">{t.summary}</p>
              <p className="mt-2 text-body text-fg-muted">{t.when}</p>

              <h3 className="mt-6 text-body font-semibold">Arguments</h3>
              <div tabIndex={0} role="region" aria-label={`${t.title} arguments`} className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-caption">
                  <thead>
                    <tr className="border-b border-line text-fg-muted">
                      <th scope="col" className="py-2 pr-4 font-medium">Name</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Type</th>
                      <th scope="col" className="py-2 font-medium">What It Does</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.args.map((a) => (
                      <tr key={a.name} className="border-b border-line align-top">
                        <th scope="row" className="py-2 pr-4 font-mono font-normal">
                          {a.name}
                          {a.optional ? <span className="ml-2 font-sans text-fg-muted">Optional</span> : null}
                        </th>
                        <td className="py-2 pr-4 font-mono text-fg-muted">{a.type}</td>
                        <td className="py-2 text-fg">{a.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4">
                <CopyBlock label="Example Call" code={t.exampleCall} />
                <div className="min-w-0 rounded-panel border border-line bg-surface">
                  <div className="border-b border-line px-4 py-2 text-caption text-fg-muted">Reply</div>
                  <pre tabIndex={0} role="region" aria-label={`${t.title} example reply`} className="max-h-80 overflow-auto px-4 py-4 font-mono text-caption text-fg">
                    <code>{t.exampleReply}</code>
                  </pre>
                </div>
              </div>
            </section>
          ))}

          <section id="clients" className="mt-14 border-t border-line pt-10">
            <h2 className="text-title font-semibold tracking-tight">Clients</h2>
            <p className="mt-3 text-body text-fg-muted">Two small clients with no dependencies ship in the repository&apos;s clients folder, one for Python and one for TypeScript.</p>
            <div className="mt-4 grid grid-cols-1 gap-4">
              <CopyBlock label="Python" code={pythonClient} />
              <CopyBlock label="TypeScript" code={tsClient} />
            </div>
          </section>

          <section id="models" className="mt-14 border-t border-line pt-10">
            <h2 className="text-title font-semibold tracking-tight">Models</h2>
            <p className="mt-3 text-body text-fg-muted">Proton uses three open models, each under its own licence.</p>
            <ul className="mt-4 flex flex-col">
              {credits.map((c) => (
                <li key={c.name}>
                  <a href={c.href} rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 text-body text-accent underline underline-offset-4">
                    <span className="font-mono">{c.name}</span>
                    <span className="text-fg-muted no-underline">by {c.by}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
