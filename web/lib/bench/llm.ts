// Asks a local Ollama model the same fixed-label questions Proton answers, and checks that the reply is a valid label.
// Self-contained on purpose: scripts/bench-llm.mjs loads it straight from Node.

export interface LlmTask {
  id: string
  instruction: string
  input: string
  labels: string[]
  // How each label is shown to the model; defaults to the label itself.
  lines?: string[]
  // Number of inputs answered in one call (the triage task sorts five issues at once).
  count?: number
}

export interface Verdict {
  label: string
  confidence: number
}

export function buildPrompt(t: LlmTask): string {
  const count = t.count ?? 1
  const shape = count > 1 ? `{"items": [{"label": "...", "confidence": 0.0}, ...]} with exactly ${count} items, one per input line, in order` : '{"label": "...", "confidence": 0.0}'
  return [
    `You sort text into labels. ${t.instruction}`,
    '',
    'Labels:',
    ...(t.lines ?? t.labels).map((l) => `- ${l}`),
    '',
    'Input:',
    t.input,
    '',
    `Answer with JSON only, in this shape: ${shape}. Use a label exactly as written above. The confidence is a number from 0 to 1.`,
  ].join('\n')
}

const unfence = (text: string) => text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

export function parseVerdicts(text: string, labels: string[], count = 1): Verdict[] | null {
  let data: unknown
  try {
    data = JSON.parse(unfence(text))
  } catch {
    return null
  }
  const raw = count > 1 ? (data as { items?: unknown })?.items : [data]
  if (!Array.isArray(raw) || raw.length !== count) return null
  const out: Verdict[] = []
  for (const r of raw) {
    const label = typeof (r as Verdict)?.label === 'string' ? labels.find((l) => l.toLowerCase() === (r as Verdict).label.trim().toLowerCase()) : undefined
    const confidence = Number((r as Verdict)?.confidence)
    if (!label || !Number.isFinite(confidence)) return null
    out.push({ label, confidence: Math.min(1, Math.max(0, confidence)) })
  }
  return out
}

export interface AskOptions {
  keepAlive?: string | number
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export async function ask(baseUrl: string, model: string, prompt: string, opts: AskOptions = {}): Promise<{ text: string; ms: number }> {
  const f = opts.fetchImpl ?? fetch
  const t0 = performance.now()
  const res = await f(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      think: false,
      format: 'json',
      keep_alive: opts.keepAlive,
      options: { temperature: 0, num_predict: 400 },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 300_000),
  })
  if (!res.ok) throw new Error(`ollama HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const body = (await res.json()) as { message?: { content?: string } }
  return { text: body.message?.content ?? '', ms: performance.now() - t0 }
}

export async function modelInstalled(baseUrl: string, model: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(10_000) })
      if (!res.ok) continue
      const body = (await res.json()) as { models?: { name: string }[] }
      return !!body.models?.some((m) => m.name === model)
    } catch {
      // Ollama can be slow to answer while it loads or unloads a model; try once more.
    }
  }
  return false
}

export interface GoldItem {
  query: string
  accept: string[]
}

export const isHit = (name: string | undefined, gold: GoldItem): boolean => !!name && gold.accept.includes(name)
