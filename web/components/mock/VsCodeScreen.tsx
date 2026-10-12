import type { ReactNode } from 'react'
import { BrandMark } from '@/components/BrandMark'
import { Mark } from '@/components/Mark'
import { Bell, Blocks, Bug, Check, Files, FileText, GitBranch, Search, Settings, Terminal, UserRound, X } from '@/components/icons/generated'
import { CMD_CLAUDE, CMD_INSTALL, CMD_LIST, CMD_MCP, type Phase, type Screen } from '@/lib/mock/script'
import { site } from '@/site.config'

// A VS Code window in the site's 1-bit look, mirroring the Proton extension (vscode/src/dashboard.ts, extension.ts):
// phase wording, Start/Stop/Restart, the first-run note and the status bar item. Invented: file paths, the percent steps, the version in the list.
// Not claimed: speed of the download or start. Nothing here is focusable.
export interface Decision {
  prompt: string
  label: string
  ms: number
}

const SIDEBAR_PHASE: Record<Phase, string> = { off: 'Off', starting: 'Starting', downloading: 'Downloading Models', ready: 'Ready' }
const BAR_PHASE: Record<Phase, string> = { off: 'Off', starting: 'Loading', downloading: 'Downloading Models', ready: 'Ready' }
const ADDRESS = new URL(site.mcpUrl).host
const PROMPT = 'PS C:\\work>'

const rowBtn = 'inline-flex min-h-7 items-center border border-ink px-3 text-caption'

function Dot({ phase }: { phase: Phase }) {
  const fill = phase === 'ready' ? 'bg-ink' : phase === 'off' ? 'bg-paper' : 'bg-well'
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-dot border border-ink ${fill}`} />
}

function Caret() {
  return <span aria-hidden="true" className="caret ml-px inline-block h-4 w-2 translate-y-0.5 bg-ink [[data-visible=false]_&]:[animation-play-state:paused]" />
}

function ActivityIcon({ children, active = false, hidden = false }: { children: ReactNode; active?: boolean; hidden?: boolean }) {
  return (
    <span className={`flex size-12 items-center justify-center ${active ? 'bg-paper text-ink' : 'text-paper'} ${hidden ? 'opacity-0' : ''}`}>{children}</span>
  )
}

function Prompt({ text, n, caret }: { text: string; n: number; caret: boolean }) {
  return (
    <div className="whitespace-nowrap">
      {PROMPT} {text.slice(0, n)}
      {caret && <Caret />}
    </div>
  )
}

function ExtensionsPane({ s }: { s: Screen }) {
  return (
    <div className={`absolute inset-0 p-4 motion-safe:transition-opacity motion-safe:duration-[var(--duration-state)] ${s.view === 'extensions' ? '' : 'opacity-0'}`}>
      <p className="m-0 font-pixel text-pixel">Extensions</p>
      <div className="mt-3 flex items-center gap-2 border border-ink bg-paper px-2 py-1.5 text-caption">
        <Search size={16} />
        Search Extensions in Marketplace
      </div>
      <div className="mt-4 flex items-start gap-3 border-b border-ink pb-4">
        <span className="flex size-11 shrink-0 items-center justify-center bg-ink text-paper">
          <Mark size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 flex items-baseline justify-between gap-2 text-body font-medium">
            Proton <span className="font-mono text-caption font-normal">{site.version}</span>
          </p>
          <p className="m-0 mt-1 text-caption">Runs the Proton server inside VS Code, with a status item and a sidebar view.</p>
          <p className="m-0 mt-3">
            {s.installed ? (
              <span className={`${rowBtn} gap-1`}>
                <Check size={14} /> Installed
              </span>
            ) : (
              <span className={`${rowBtn} bg-ink text-paper`}>Install</span>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

function ProtonPane({ s }: { s: Screen }) {
  const running = s.phase !== 'off'
  const dl = s.phase === 'downloading' || s.phase === 'ready'
  const status = s.phase === 'downloading' ? `${SIDEBAR_PHASE.downloading} ${s.percent}%` : SIDEBAR_PHASE[s.phase]
  return (
    <div className={`absolute inset-0 p-4 motion-safe:transition-opacity motion-safe:duration-[var(--duration-state)] ${s.view === 'proton' ? '' : 'opacity-0'}`}>
      <p className="m-0 font-pixel text-pixel">Proton</p>
      <p className="m-0 mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 border border-ink bg-paper px-2 py-0.5 text-caption">
          <Dot phase={s.phase} />
          {status}
        </span>
      </p>
      <p className="m-0 mt-3 flex flex-wrap gap-2">
        <span className={`${rowBtn} ${running ? 'border-dashed' : 'bg-ink text-paper'}`}>Start</span>
        <span className={`${rowBtn} ${running ? '' : 'border-dashed'}`}>Stop</span>
        <span className={`${rowBtn} ${running ? '' : 'border-dashed'}`}>Restart</span>
      </p>
      <p className={`m-0 mt-3 min-h-16 text-caption ${s.phase === 'downloading' ? '' : 'opacity-0'}`}>First run: downloading the model files. Proton starts when they are in place.</p>
      <dl className="m-0 border-t border-ink text-caption">
        {[
          ['Status', status],
          ['Address', ADDRESS],
          ['Version', site.version],
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-[5.5rem_1fr] gap-2 border-b border-ink py-1.5">
            <dt>{k}</dt>
            <dd className={`m-0 truncate ${k === 'Status' ? '' : 'font-mono'}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className={`mt-4 ${dl ? '' : 'opacity-0'}`}>
        <p className="m-0 flex justify-between text-caption">
          <span>{s.phase === 'ready' ? 'Ready' : 'Downloading Models'}</span>
          <span className="font-mono">{s.percent}%</span>
        </p>
        <span className="mt-1 block h-4 overflow-hidden border border-ink bg-paper">
          <span
            className="block h-full origin-left bg-ink motion-safe:transition-transform motion-safe:duration-[var(--duration-state)]"
            style={{ transform: `scaleX(${s.percent / 100})` }}
          />
        </span>
      </div>
    </div>
  )
}

function TerminalLines({ s, decision }: { s: Screen; decision: Decision }) {
  const p2 = s.installOut === 2
  const p3 = s.addOut
  const p4 = s.listOut === 2
  return (
    <div className="min-h-0 flex-1 overflow-hidden p-3 font-mono text-caption">
      <Prompt text={CMD_INSTALL} n={s.c1} caret={s.installOut === 0} />
      {s.installOut >= 1 && <div>Installing extensions...</div>}
      {s.installOut === 2 && <div>Extension &apos;proton.vsix&apos; was successfully installed.</div>}
      {p2 && <Prompt text={CMD_MCP} n={s.c2} caret={!s.addOut} />}
      {s.addOut && <div>Added HTTP MCP server proton with URL: {site.mcpUrl} to user config</div>}
      {p3 && <Prompt text={CMD_LIST} n={s.c3} caret={s.listOut === 0} />}
      {s.listOut === 1 && <div>Checking MCP server health...</div>}
      {s.listOut === 2 && (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BrandMark slug="mcp" size={16} />
          <span>proton: {site.mcpUrl} (HTTP) -</span>
          <span className="inline-flex items-center gap-1 bg-ink px-1.5 text-paper">
            <Check size={14} /> Connected
          </span>
        </div>
      )}
      {p4 && <Prompt text={CMD_CLAUDE} n={s.c4} caret={!s.decision} />}
      {s.decision && (
        <div className="mt-2">
          <div className="flex items-center gap-2 whitespace-nowrap font-medium">
            <BrandMark slug="mcp" size={16} />
            proton - decide (MCP)
          </div>
          <div className="truncate pl-6">text: &quot;{decision.prompt}&quot;</div>
          <div className="pl-6 font-medium">
            {decision.label}, {decision.ms} ms
          </div>
        </div>
      )}
    </div>
  )
}

export function VsCodeScreen({ s, decision }: { s: Screen; decision: Decision }) {
  return (
    <div className="flex h-full w-full flex-col bg-paper text-ink">
      <div className="relative flex h-9 shrink-0 items-center gap-4 border-b border-ink bg-well px-3 text-caption">
        <BrandMark slug="vscode" size={18} />
        <span className="flex gap-4">
          {['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </span>
        <span className="absolute left-1/2 -translate-x-1/2">Welcome - Visual Studio Code</span>
        <span className="ml-auto flex gap-1.5">
          <span className="size-3 border border-ink" />
          <span className="size-3 border border-ink" />
          <span className="size-3 border border-ink bg-ink" />
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-12 shrink-0 flex-col bg-ink">
          <ActivityIcon><Files size={24} /></ActivityIcon>
          <ActivityIcon><Search size={24} /></ActivityIcon>
          <ActivityIcon><GitBranch size={24} /></ActivityIcon>
          <ActivityIcon><Bug size={24} /></ActivityIcon>
          <ActivityIcon active={s.view === 'extensions'}><Blocks size={24} /></ActivityIcon>
          <ActivityIcon active={s.view === 'proton'} hidden={!s.installed}><Mark size={24} /></ActivityIcon>
          <span className="mt-auto flex flex-col">
            <ActivityIcon><UserRound size={24} /></ActivityIcon>
            <ActivityIcon><Settings size={24} /></ActivityIcon>
          </span>
        </div>

        <div className="relative w-[19rem] shrink-0 border-r border-ink bg-well">
          <ExtensionsPane s={s} />
          <ProtonPane s={s} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-9 shrink-0 items-stretch border-b border-ink bg-well text-caption">
            <span className="flex items-center gap-2 border-r border-ink bg-paper px-3">
              <FileText size={16} /> Welcome <X size={14} />
            </span>
          </div>
          <div className="min-h-0 flex-1 p-10">
            <p className="m-0 font-pixel text-pixel-lg">Visual Studio Code</p>
            <p className="m-0 mt-1 text-body">Editing evolved</p>
            <p className="m-0 mt-8 text-body font-medium">Start</p>
            <ul className="m-0 mt-2 list-none p-0 text-body underline">
              <li>New File...</li>
              <li>Open File...</li>
              <li>Open Folder...</li>
            </ul>
          </div>

          <div className="flex h-[20rem] shrink-0 flex-col border-t border-ink">
            <div className="flex h-9 shrink-0 items-center gap-5 border-b border-ink bg-well px-3 text-caption">
              <span>Problems</span>
              <span>Output</span>
              <span className="-mb-px flex h-9 items-center gap-1.5 border-b-2 border-ink font-medium">
                <Terminal size={16} /> Terminal
              </span>
              <span className="ml-auto flex items-center gap-2 border border-ink bg-paper px-2 py-0.5">
                <BrandMark slug="claude-code" size={16} /> Claude Code
              </span>
            </div>
            <TerminalLines s={s} decision={decision} />
          </div>
        </div>
      </div>

      <div className="flex h-7 shrink-0 items-center gap-4 bg-ink px-3 text-caption text-paper">
        <span className="flex items-center gap-1.5">
          <Mark size={16} />
          {s.phase === 'downloading' ? `${BAR_PHASE.downloading} ${s.percent}%` : BAR_PHASE[s.phase]}
        </span>
        <span className="ml-auto flex items-center gap-4">
          <span>UTF-8</span>
          <Bell size={14} />
        </span>
      </div>
    </div>
  )
}
