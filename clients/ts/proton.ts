// Dependency-free client for the shared Proton MCP server (streamable HTTP, JSON-RPC over fetch).
//   import { Proton } from './proton.ts'
//   const p = await Proton.connect(); await p.decide('text', { intent: ['a', 'b'] })
// Smoke check: node clients/ts/proton.ts   (Node 22.6+ strips the types itself)

export type Heads = Record<string, string[] | { labels: string[] | Record<string, string>; multi_label?: boolean }>
export type Rule = Record<string, unknown>

const PROTOCOL = '2025-06-18'
const DEFAULT_URL = process.env.PROTON_URL ?? 'http://127.0.0.1:9400/mcp'

export class Proton {
  private session: string | null = null
  private id = 0

  private readonly url: string
  private readonly timeoutMs: number

  private constructor(url: string, timeoutMs: number) {
    this.url = url
    this.timeoutMs = timeoutMs
  }

  static async connect(url = DEFAULT_URL, timeoutMs = 300_000): Promise<Proton> {
    const p = new Proton(url, timeoutMs)
    await p.rpc('initialize', {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'proton-client-ts', version: '1.0.0' },
    })
    await p.post({ jsonrpc: '2.0', method: 'notifications/initialized' })
    return p
  }

  private async post(payload: object): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
    if (this.session) {
      headers['Mcp-Session-Id'] = this.session
      headers['MCP-Protocol-Version'] = PROTOCOL
    }
    const res = await fetch(this.url, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(this.timeoutMs) })
    if (!res.ok && res.status !== 202) throw new Error(`proton HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
    this.session = res.headers.get('mcp-session-id') ?? this.session
    return res.text()
  }

  private async rpc(method: string, params: object): Promise<any> {
    const body = (await this.post({ jsonrpc: '2.0', id: ++this.id, method, params })).trim()
    const line = body.startsWith('{') ? body : body.split(/\r?\n/).find((l) => l.startsWith('data:'))?.slice(5).trim()
    if (!line) throw new Error(`proton: unparseable response: ${body.slice(0, 200)}`)
    const msg = JSON.parse(line)
    if (msg.error) throw new Error(`proton: ${JSON.stringify(msg.error)}`)
    return msg.result
  }

  async listTools(): Promise<string[]> {
    return (await this.rpc('tools/list', {})).tools.map((t: { name: string }) => t.name)
  }

  async call<T = any>(name: string, args: object): Promise<T> {
    const res = await this.rpc('tools/call', { name, arguments: args })
    const text: string = res.content?.[0]?.text ?? 'null'
    if (res.isError) throw new Error(`proton ${name}: ${text}`)
    return JSON.parse(text) as T
  }

  decide(text: string, heads: Heads, rules?: Rule[]) {
    return this.call('decide', rules ? { text, heads, rules } : { text, heads })
  }

  decideBatch(texts: string[], heads: Heads, rules?: Rule[]) {
    return this.call('decide_batch', rules ? { texts, heads, rules } : { texts, heads })
  }

  locateSkill(task: string, opts: { top_k?: number; kinds?: ('skill' | 'agent')[]; project?: string } = {}) {
    return this.call('locate_skill', { task, ...opts })
  }

  rank(texts: string[], criterion: string) {
    return this.call('rank', { texts, criterion })
  }

  triage(items: string[], labels: string[] | Record<string, string>) {
    return this.call('triage', { items, labels })
  }

  risk(actionName: string, argsSummary = '') {
    return this.call<{ risk: 'read' | 'write' | 'send' | 'destructive'; score: number; source: string }>('risk', {
      action_name: actionName,
      args_summary: argsSummary,
    })
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()!)) {
  const p = await Proton.connect()
  const tools = await p.listTools()
  console.log('tools:', tools.join(', '))
  if (!tools.includes('decide')) throw new Error('decide missing')
  const out = await p.decide('What is the capital of France?', { safety: ['safe', 'unsafe'] })
  if (out.decisions.safety.label !== 'safe') throw new Error(JSON.stringify(out))
  console.log('PASS')
}
