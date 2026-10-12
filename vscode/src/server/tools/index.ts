// Proton's MCP tools; a new tool is one module plus one row in TOOLS.
import { z, type ZodRawShape } from 'zod';
import { decide, decideMany } from '../decide';
import * as ask from './ask';
import * as locateSkill from './locateSkill';
import * as rank from './rank';
import * as risk from './risk';
import * as triage from './triage';

export type Tool = { name: string; description: string; schema: ZodRawShape; run: (args: any) => Promise<unknown> };

const heads = z.record(z.any());
const rules = z.array(z.record(z.any())).nullable().optional();
const thresholds = z.record(z.any()).nullable().optional();
const riskClass = z.string().nullable().optional();

const decideTool: Tool = {
  name: 'decide',
  description: `Make typed decisions about text with small local CPU encoders (no generation).

heads: {name: [labels]} for single-label, or {name: {"labels": [...] or {label: description},
"multi_label": true}}. Fixed hook heads (injection, complexity) use e5-base-v2 prototypes; any other
head uses GLiClass (at most 100 labels per head). rules: optional cross-head constraints, each
{"implies": ["head=label", "head=label"]}, {"excludes": [...]}, {"iff": [...]}, or a raw dict
({"type": "Implies"|"Iff"|"Excludes"|"And"|"Or"|"Not"|"LabelRef", ...}). The answer is the best
joint assignment over each head's top labels that satisfies every rule; \`feasible\` says whether one existed.
Each decision also carries confidence_norm, margin, ratio, rule_overrode, calibrated (null when the head has no
calibration), gate_basis and action (act, confirm or ask_person). The action compares the calibrated
probability, else the raw confidence, with \`thresholds\` {act, review}, else the row for \`risk\`
(read, write, send or destructive; default write). Infeasible rules force ask_person.
Not a reasoner: it cannot explain or answer open questions.`,
  schema: { text: z.string(), heads, rules, thresholds, risk: riskClass },
  run: (a) => decide(a.text, a.heads, a.rules, a.thresholds, a.risk),
};

const decideBatch: Tool = {
  name: 'decide_batch',
  description: 'decide() over many texts with one schema; returns {"results": [decide() output, ...]} in input order.',
  schema: { texts: z.array(z.string()), heads, rules, thresholds, risk: riskClass },
  run: async (a) => ({ results: await decideMany(a.texts, a.heads, a.rules, a.thresholds, a.risk) }),
};

export const TOOLS: Tool[] = [decideTool, decideBatch, ask.tool, locateSkill.tool, rank.tool, triage.tool, risk.tool];
