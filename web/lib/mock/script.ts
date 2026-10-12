import { site } from '@/site.config'

// The story the install mock plays once. Each beat patches the screen; the last frame is the still image.
// Phases and their wording mirror vscode/src/dashboard.ts (PHASE) and extension.ts. Percent steps are a labelled sample, not a measurement.
export type Phase = 'off' | 'starting' | 'downloading' | 'ready'

export interface Screen {
  c1: number
  c2: number
  c3: number
  c4: number
  installOut: 0 | 1 | 2
  addOut: boolean
  listOut: 0 | 1 | 2
  decision: boolean
  installed: boolean
  view: 'extensions' | 'proton'
  phase: Phase
  percent: number
}

export interface Beat {
  after: number
  patch: Partial<Screen>
}

export const CMD_INSTALL = 'code --install-extension proton.vsix'
export const CMD_MCP = `claude mcp add --transport http -s user proton ${site.mcpUrl}`
export const CMD_LIST = 'claude mcp list'
export const CMD_CLAUDE = 'claude'

export const INITIAL: Screen = {
  c1: 0,
  c2: 0,
  c3: 0,
  c4: 0,
  installOut: 0,
  addOut: false,
  listOut: 0,
  decision: false,
  installed: false,
  view: 'extensions',
  phase: 'off',
  percent: 0,
}

type Typed = 'c1' | 'c2' | 'c3' | 'c4'

/** Start times: each beat waits `after` ms for the one before; the first starts at zero. */
export function cumulative(delays: number[]): number[] {
  let t = 0
  return delays.map((d, i) => (t = i === 0 ? 0 : t + d))
}

/** Types `text` in chunks. `lead` is the pause before the first chunk. */
export function typeBeats(key: Typed, text: string, lead: number, chunk = 3, ms = 80): Beat[] {
  const out: Beat[] = []
  for (let n = chunk; ; n += chunk) {
    const shown = Math.min(text.length, n)
    out.push({ after: out.length === 0 ? lead : ms, patch: { [key]: shown } })
    if (shown === text.length) return out
  }
}

const beats: Beat[] = [
  { after: 0, patch: {} },
  ...typeBeats('c1', CMD_INSTALL, 600),
  { after: 400, patch: { installOut: 1 } },
  { after: 800, patch: { installOut: 2, installed: true } },
  { after: 1000, patch: { view: 'proton', phase: 'starting' } },
  { after: 700, patch: { phase: 'downloading', percent: 8 } },
  { after: 600, patch: { percent: 31 } },
  { after: 600, patch: { percent: 57 } },
  { after: 600, patch: { percent: 82 } },
  { after: 600, patch: { phase: 'ready', percent: 100 } },
  ...typeBeats('c2', CMD_MCP, 900),
  { after: 400, patch: { addOut: true } },
  ...typeBeats('c3', CMD_LIST, 800),
  { after: 400, patch: { listOut: 1 } },
  { after: 700, patch: { listOut: 2 } },
  ...typeBeats('c4', CMD_CLAUDE, 800),
  { after: 700, patch: { decision: true } },
]

export const STARTS = cumulative(beats.map((b) => b.after))

export const FRAMES: Screen[] = beats.reduce<Screen[]>((acc, b) => [...acc, { ...(acc[acc.length - 1] ?? INITIAL), ...b.patch }], [])
