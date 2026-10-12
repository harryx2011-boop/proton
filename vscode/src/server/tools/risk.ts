import { z } from 'zod';
import { gate, marginRatio, norm, temper, thresholdsFor, type ThresholdTable } from '../confidence';
import { data } from '../models';
import * as proto from '../proto';
import type { Tool } from './index';

const ORDER = Object.keys(proto.RISK);
const CAL: Record<string, { temperature?: number }> = data('calibration.json');
const TH: ThresholdTable = data('thresholds.json');
// a model score is not a guard: a name that plainly says it mutates can never come back as read
const VERBS: [string, RegExp][] = [
  ['destructive', /^(?:delete|remove|destroy|drop|purge|revoke|cancel|archive|wipe|erase|truncate|reset|terminate|unsubscribe)$/],
  ['send', /^(?:send|reply|forward|post|publish|invite|share|broadcast|notify|tweet|dm)$/],
  ['write', /^(?:create|add|update|edit|set|put|patch|insert|move|rename|upload|write|append|assign|merge|commit|push|deploy|install|import|submit|complete|mark|close|open|schedule)$/],
];
const READ = /^(?:get|list|search|find|fetch|read|view|show|check|count|lookup|query|retrieve|describe|download|export|preview|resolve|whoami|status)$/;

export function lexical(actionName: string): string | null {
  const toks = actionName.split(/[^A-Za-z]+|(?<=[a-z])(?=[A-Z])/).filter(Boolean).map((t) => t.toLowerCase());
  // the first verb decides: GMAIL_GET_MESSAGE reads, GMAIL_SEND_EMAIL sends
  for (const t of toks) {
    if (READ.test(t)) return null;
    for (const [cls, re] of VERBS) if (re.test(t)) return cls;
  }
  return null;
}

export async function run(actionName: string, argsSummary: string, thresholds?: unknown) {
  const text = `${actionName} ${argsSummary}`.replaceAll('_', ' ').replaceAll('-', ' ');
  const p = await proto.classify(text, proto.RISK);
  let label = Object.keys(p).reduce((a, b) => (p[b] > p[a] ? b : a));
  const score = p[label];
  const floor = lexical(actionName);
  let source = 'model';
  if (floor && ORDER.indexOf(floor) > ORDER.indexOf(label)) [label, source] = [floor, 'lexical'];
  const [margin, ratio] = marginRatio(p);
  const t = CAL.risk?.temperature;
  const th = thresholdsFor(label, thresholds, TH);
  const cal = t ? temper(p, t)[label] : null;
  return {
    risk: label, score, source, ranked: Object.entries(p).sort((a, b) => b[1] - a[1]),
    confidence_norm: norm(p[label], Object.keys(p).length), margin, ratio, rule_overrode: source === 'lexical',
    calibrated: cal,
    gate_basis: cal === null ? 'raw' : 'calibrated', action: gate(cal ?? p[label], th),
  };
}

export const tool: Tool = {
  name: 'risk',
  description: `Classify a tool action as read, write, send or destructive (for a PreToolUse guard).

action_name is the tool or action id (e.g. GMAIL_SEND_EMAIL); args_summary is a short line of
its arguments. A model verdict is raised, never lowered, when the name carries a mutating verb
(source: "lexical"). Anything above read should ask the user.

\`action\` is act, confirm or ask_person from the verdict's probability against the thresholds of the
verdict's own class; \`thresholds\` {act, review} overrides them.`,
  schema: { action_name: z.string(), args_summary: z.string().default(''), thresholds: z.record(z.any()).nullable().optional() },
  run: (a) => run(a.action_name, a.args_summary ?? '', a.thresholds),
};
