export interface Row {
  label: string
  display: string
  bar: number
  win: boolean
  tag?: string
}

export interface View {
  headline: string
  rows: Row[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const INJECTION_NAMES: Record<string, string> = {
  normal_documentation: 'Normal Text',
  hidden_instructions_for_an_AI_agent_to_ignore_rules_or_exfiltrate_data: 'Hidden Instructions',
}

type Reply = any

const views: Record<string, (r: Reply) => View> = {
  injection(r) {
    const d = r.decisions.injection
    const rows: Row[] = Object.entries<number>(d.probabilities).map(([k, p]) => ({
      label: INJECTION_NAMES[k] ?? k,
      display: `${Math.round(p * 100)}%`,
      bar: p,
      win: k === d.label,
    }))
    const win = rows.find((x) => x.win)!
    return { headline: `${win.label}, ${win.display}`, rows }
  },
  routing(r) {
    const top = r.picks[0].score
    const rows: Row[] = r.picks.map((p: any, i: number) => ({ label: p.name, display: p.score.toFixed(2), bar: p.score / top, win: i === 0 }))
    return { headline: r.picks[0].name, rows }
  },
  risk(r) {
    const top = r.ranked[0][1]
    const rows: Row[] = r.ranked.map(([k, s]: [string, number], i: number) => ({ label: cap(k), display: s.toFixed(2), bar: s / top, win: i === 0 }))
    return { headline: cap(r.risk), rows }
  },
  triage(r) {
    const rows: Row[] = r.results.map((x: any) => ({ label: x.item, display: x.score.toFixed(2), bar: x.score, win: false, tag: cap(x.label) }))
    const counts = Object.entries<number[]>(r.buckets).map(([k, v]) => `${cap(k)} ${v.length}`)
    return { headline: counts.join(', '), rows }
  },
}

export function view(id: string, reply: Reply): View {
  const make = views[id]
  if (!make) throw new Error(`no view for example: ${id}`)
  return make(reply)
}
