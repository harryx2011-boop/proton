import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { tools } from '@/lib/docs/tools'
import { credits } from '@/lib/credits'
import { site } from '@/site.config'
import { CopyBlock } from '@/components/CopyBlock'
import { BrandMark } from '@/components/BrandMark'
import { Window } from '@/components/retro/Window'
import { DocsNav, type NavItem } from '@/components/docs/DocsNav'
import { ArrowUpDown, Files, Gauge, GitFork, ListChecks, Route } from '@/components/icons/generated'

export const metadata: Metadata = { title: 'Tools and Docs', description: 'The six Proton tools: what each one does, its arguments, an example call and a real reply.' }

const toolIcon: Record<string, ReactNode> = {
  decide: <GitFork />,
  decide_batch: <Files />,
  locate_skill: <Route />,
  rank: <ArrowUpDown />,
  triage: <ListChecks />,
  risk: <Gauge />,
}

const menu: NavItem[] = [
  { id: 'overview', label: 'Overview' },
  ...tools.map((t) => ({ id: t.name, label: t.title, icon: toolIcon[t.name] })),
  { id: 'clients', label: 'Clients' },
  { id: 'models', label: 'Models' },
]

const pythonClient = `from proton_client import Proton

p = Proton()
p.decide("Is this a bug or a feature?", {"kind": ["bug", "feature"]})`

const tsClient = `import { Proton } from './proton.ts'

const p = await Proton.connect()
await p.decide('Is this a bug or a feature?', { kind: ['bug', 'feature'] })`

const heading = 'm-0 font-pixel text-pixel-lg font-normal'

export default function Docs() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <h1 className="m-0 text-heading tracking-heading">Tools and Docs</h1>
      <p className="m-0 mt-5 max-w-prose text-lead">Proton is a server with six tools. Every reply on this page is a real reply from a running server.</p>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside>
          <DocsNav items={menu} />
        </aside>

        <div className="flex min-w-0 flex-col gap-8">
          <div id="overview">
            <Window title="Proton.Docs" bodyClassName="flex flex-col gap-4 p-4 md:p-8">
              <h2 className={heading}>Overview</h2>
              <p className="m-0 flex max-w-prose items-start gap-2 text-body">
                <BrandMark slug="mcp" size={24} className="mt-0.5" />
                <span>
                  Any program that speaks MCP, the Model Context Protocol and the standard way agents call tools, can use them. The server listens on{' '}
                  <code className="font-mono text-caption">{site.mcpUrl}</code>.
                </span>
              </p>
              <p className="m-0 flex max-w-prose items-start gap-2 text-body">
                <BrandMark slug="claude-code" size={24} className="mt-0.5" />
                <span>Add it to Claude Code once and every session can call the tools.</span>
              </p>
              <CopyBlock label="Add to Claude Code" code={`claude mcp add --transport http -s user proton ${site.mcpUrl}`} />
              <p className="m-0 flex max-w-prose items-start gap-2 text-body">
                <BrandMark slug="vscode" size={24} className="mt-0.5" />
                <span>This release comes as an extension for VS Code on {site.platform}. Scores are comparisons, not probabilities, unless a tool says otherwise.</span>
              </p>
              <p className="m-0 max-w-prose text-body">
                What changed in each version is on the{' '}
                <Link href="/changelog" className="flip biglink inline-flex min-h-11 items-center px-1 underline">
                  Changelog
                </Link>
                {' '}page.
              </p>
            </Window>
          </div>

          {tools.map((t) => (
            <div key={t.name} id={t.name}>
              <Window title={t.name} icon={toolIcon[t.name]} bodyClassName="flex flex-col gap-5 p-4 md:p-8">
                <h2 className={heading}>{t.title}</h2>
                <div className="max-w-prose">
                  <p className="m-0 text-body">{t.summary}</p>
                  <p className="m-0 mt-2 text-body">{t.when}</p>
                </div>

                <div>
                  <h3 className={heading}>Arguments</h3>
                  <div tabIndex={0} role="region" aria-label={`${t.title} arguments`} className="mt-3 overflow-x-auto border border-ink">
                    <table className="w-full min-w-[34rem] border-collapse text-left text-caption">
                      <thead className="win-gray">
                        <tr>
                          <th scope="col" className="border-b border-r border-ink px-3 py-2 font-pixel text-pixel font-normal">Name</th>
                          <th scope="col" className="border-b border-r border-ink px-3 py-2 font-pixel text-pixel font-normal">Type</th>
                          <th scope="col" className="border-b border-ink px-3 py-2 font-pixel text-pixel font-normal">What It Does</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.args.map((a, i) => (
                          <tr key={a.name} className="align-top">
                            <th scope="row" className={`border-r border-ink px-3 py-2 font-mono font-normal ${i < t.args.length - 1 ? 'border-b' : ''}`}>
                              {a.name}
                              {a.optional ? <span className="ml-2 font-pixel text-pixel">Optional</span> : null}
                            </th>
                            <td className={`border-r border-ink px-3 py-2 font-mono ${i < t.args.length - 1 ? 'border-b' : ''}`}>{a.type}</td>
                            <td className={`border-ink px-3 py-2 ${i < t.args.length - 1 ? 'border-b' : ''}`}>{a.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <CopyBlock label="Example Call" code={t.exampleCall} />
                <Window title="Reply.json" gray>
                  <pre tabIndex={0} role="region" aria-label={`${t.title} example reply`} className="m-0 max-h-80 overflow-auto p-3 font-mono text-caption">
                    <code>{t.exampleReply}</code>
                  </pre>
                </Window>
              </Window>
            </div>
          ))}

          <div id="clients">
            <Window title="Clients" bodyClassName="flex flex-col gap-5 p-4 md:p-8">
              <h2 className={heading}>Clients</h2>
              <p className="m-0 max-w-prose text-body">Two small clients with no dependencies ship in the repository&apos;s clients folder, one for Python and one for TypeScript.</p>
              <div className="flex flex-col gap-2">
                <h3 className={`${heading} flex items-center gap-2`}>
                  <BrandMark slug="python" size={28} />
                  Python
                </h3>
                <CopyBlock label="Python Client" code={pythonClient} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className={`${heading} flex items-center gap-2`}>
                  <BrandMark slug="typescript" size={28} />
                  TypeScript
                </h3>
                <CopyBlock label="TypeScript Client" code={tsClient} />
              </div>
            </Window>
          </div>

          <div id="models">
            <Window title="Models" bodyClassName="flex flex-col gap-4 p-4 md:p-8">
              <h2 className={heading}>Models</h2>
              <p className="m-0 max-w-prose text-body">Proton uses three open models, each under its own licence.</p>
              <ul className="m-0 flex list-none flex-col border-t border-ink p-0">
                {credits.map((c) => (
                  <li key={c.name} className="border-b border-ink">
                    <a href={c.href} rel="noopener noreferrer" className="flip flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-2 py-2 text-body">
                      <BrandMark slug="huggingface" size={24} />
                      <span className="font-mono font-medium">{c.name}</span>
                      <span className="flex items-center gap-2 text-caption">
                        by
                        {c.byMark ? <BrandMark slug={c.byMark} size={18} /> : null}
                        {c.by}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </Window>
          </div>
        </div>
      </div>
    </div>
  )
}
