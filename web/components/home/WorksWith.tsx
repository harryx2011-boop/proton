import { BrandMark } from '@/components/BrandMark'
import { Section } from '@/components/Section'
import { Window } from '@/components/retro/Window'
import type { BrandSlug } from '@/lib/brands'

const rows: { slug: BrandSlug; name: string; role: string }[] = [
  { slug: 'vscode', name: 'VS Code', role: 'Runs the Proton extension and shows its status in the sidebar.' },
  { slug: 'claude-code', name: 'Claude Code', role: 'The agent that asks Proton its questions, through MCP.' },
  { slug: 'mcp', name: 'MCP', role: 'The open protocol Claude Code and Proton use to talk to each other.' },
  { slug: 'github', name: 'GitHub', role: 'Hosts the release download and the source code.' },
  { slug: 'huggingface', name: 'Hugging Face', role: 'Where the three open models behind Proton are published.' },
]

export function WorksWith() {
  return (
    <Section title="Works With the Tools You Use">
      <Window title="Works.With">
        <ul className="m-0 list-none p-0">
          {rows.map((r) => (
            <li key={r.slug} className="grid grid-cols-[2rem_1fr] items-center gap-x-4 gap-y-1 border-b border-ink px-4 py-4 last:border-b-0 md:grid-cols-[2rem_14rem_1fr]">
              <BrandMark slug={r.slug} size={32} />
              <span className="font-pixel text-pixel-lg">{r.name}</span>
              <span className="col-start-2 text-body md:col-start-auto">{r.role}</span>
            </li>
          ))}
        </ul>
      </Window>
    </Section>
  )
}
