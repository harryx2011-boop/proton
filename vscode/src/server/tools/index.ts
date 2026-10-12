// Proton's MCP tools; a new tool is one module plus one row in TOOLS.
import { z, type ZodRawShape } from 'zod';
import { decide } from '../decide';
import * as locateSkill from './locateSkill';
import * as rank from './rank';
import * as risk from './risk';
import * as triage from './triage';

export type Tool = { name: string; description: string; schema: ZodRawShape; run: (args: any) => Promise<unknown> };

const heads = z.record(z.any());
const rules = z.array(z.record(z.any())).nullable().optional();

const decideTool: Tool = {
  name: 'decide',
  description: `Make typed decisions about text with small local CPU encoders (no generation).

heads: {name: [labels]} for single-label, or {name: {"labels": [...] or {label: description},
"multi_label": true}}. Fixed hook heads (injection, complexity) use e5-base-v2 prototypes; any other
head uses GLiClass (at most 100 labels per head). rules: optional cross-head constraints, each
{"implies": ["head=label", "head=label"]}, {"excludes": [...]}, {"iff": [...]}, or a raw dict
({"type": "Implies"|"Iff"|"Excludes"|"And"|"Or"|"Not"|"LabelRef", ...}). The answer is the best
joint assignment over each head's top labels that satisfies every rule; \`feasible\` says whether one existed.
Not a reasoner: it cannot explain or answer open questions.`,
  schema: { text: z.string(), heads, rules },
  run: (a) => decide(a.text, a.heads, a.rules),
};

const decideBatch: Tool = {
  name: 'decide_batch',
  description: 'decide() over many texts with one schema; returns {"results": [decide() output, ...]} in input order.',
  schema: { texts: z.array(z.string()), heads, rules },
  run: async (a) => {
    const results = [];
    for (const t of a.texts) results.push(await decide(t, a.heads, a.rules));
    return { results };
  },
};

export const TOOLS: Tool[] = [decideTool, decideBatch, locateSkill.tool, rank.tool, triage.tool, risk.tool];
