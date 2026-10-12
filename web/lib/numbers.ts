export interface Measured {
  id: string
  label: string
  value: number
  unit: string
  measured: string
  source: { file: string; match: string }
}

const m = (id: string, label: string, value: number, unit: string, measured: string, file: string, match: string): Measured => ({
  id,
  label,
  value,
  unit,
  measured,
  source: { file, match },
})

// Every value traces to a line in context.md; scripts/check-numbers.mjs fails if one drifts.
export const numbers: Measured[] = [
  m('latency-decide', 'Decide', 43, 'ms', '2026-10-07', 'context.md', 'decide 43,'),
  m('latency-locate', 'Locate Skill', 20, 'ms', '2026-10-07', 'context.md', 'locate 20,'),
  m('latency-rank', 'Rank', 85, 'ms', '2026-10-07', 'context.md', 'rank 85,'),
  m('latency-triage', 'Triage', 51, 'ms', '2026-10-07', 'context.md', 'triage 51,'),
  m('latency-risk', 'Risk', 34, 'ms', '2026-10-07', 'context.md', 'risk 34 ms'),
  m('memory-extension', 'This Release', 0.68, 'GB', '2026-10-07', 'context.md', 'private 0.68 GB'),
  m('memory-python', 'Python Build', 1.26, 'GB', '2026-10-07', 'context.md', 'Python 1.26 GB'),
  m('memory-earlier', 'Earlier GPU Build, Peak', 11.9, 'GB', '2026-10-06', 'context.md', 'GLiNER 4.5-11.9 GB'),
  m('routing-top1', 'Right Skill First', 24, 'of 28', '2026-10-06', 'context.md', 'top-1 24/28'),
  m('routing-top3', 'Right Skill in Top Three', 27, 'of 28', '2026-10-06', 'context.md', 'top-3 27/28'),
  m('routing-old-top1', 'Earlier Model, First', 19, 'of 28', '2026-10-06', 'context.md', '(GLiNER 19/28'),
  m('routing-old-top3', 'Earlier Model, Top Three', 24, 'of 28', '2026-10-06', 'context.md', ', 24/28)'),
  m('injection-high', 'Injection Sample One', 0.975, 'score', '2026-10-06', 'context.md', 'injections 0.975'),
  m('injection-second', 'Injection Sample Two', 0.893, 'score', '2026-10-06', 'context.md', '0.893;'),
  m('injection-docs', 'Normal Documents, Highest', 0.312, 'score', '2026-10-06', 'context.md', 'docs at most 0.312'),
]

export const byId = (id: string): Measured => {
  const found = numbers.find((n) => n.id === id)
  if (!found) throw new Error(`unknown number: ${id}`)
  return found
}
