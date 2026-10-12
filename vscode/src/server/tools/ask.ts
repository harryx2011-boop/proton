import { z } from 'zod';
import { ordinalConfidence } from '../confidence';
import { decide } from '../decide';
import type { Tool } from './index';

type Question = { type?: string; labels?: unknown; criteria?: unknown; levels?: unknown };

/** The decide() head for one question; throws on anything malformed. */
function head(name: string, q: Question): unknown {
  if (typeof q !== 'object' || q === null || Array.isArray(q)) throw new Error(`${name}: a question is an object with a type`);
  if (q.type === 'choice') {
    const l = q.labels;
    const n = Array.isArray(l) ? l.length : l && typeof l === 'object' ? Object.keys(l).length : 0;
    if (n < 2) throw new Error(`${name}: a choice needs at least 2 labels`);
    return Array.isArray(l) ? l : { labels: l };
  }
  if (q.type === 'noul') {
    // one label through the multi-label (sigmoid) path: its probability is the chance of yes
    return { labels: { yes: String(q.criteria || name.replaceAll('_', ' ')) }, multi_label: true };
  }
  if (q.type === 'score') {
    const l = q.levels;
    if (!Array.isArray(l) || l.length < 2 || new Set(l.map(String)).size !== l.length) throw new Error(`${name}: a score needs at least 2 distinct ordered levels`);
    return l.map(String);
  }
  throw new Error(`${name}: type must be choice, noul or score`);
}

function answer(q: Question, d: Record<string, any>) {
  const gate = { gate_basis: d.gate_basis, action: d.action };
  if (q.type === 'choice') return { type: 'choice', ...d };
  if (q.type === 'noul') {
    const p: number = d.probabilities.yes;
    return { type: 'noul', answer: p >= 0.5, probability: p, confidence: 2 * Math.abs(p - 0.5), ...gate };
  }
  const levels = (q.levels as unknown[]).map(String);
  const probs = levels.map((l) => d.probabilities[l] as number);
  return {
    type: 'score', level: d.label, index: levels.indexOf(d.label), expected: probs.reduce((a, p, i) => a + i * p, 0), probabilities: probs,
    confidence: ordinalConfidence(probs), top_probability: d.confidence, ...gate,
  };
}

export async function run(state: string, questions: Record<string, Question>, rules?: any, thresholds?: unknown, risk?: string | null) {
  if (typeof questions !== 'object' || questions === null || Array.isArray(questions) || !Object.keys(questions).length) {
    throw new Error('questions is a non-empty object: {name: question}');
  }
  const names = Object.keys(questions);
  const heads = Object.fromEntries(names.map((n) => [n, head(n, questions[n])]));
  const res = await decide(state, heads as any, rules, thresholds, risk);
  const d = res.decisions as Record<string, Record<string, any>>;
  return { answers: Object.fromEntries(names.map((n) => [n, answer(questions[n], d[n])])), feasible: res.feasible, violations: res.violations };
}

export const tool: Tool = {
  name: 'ask',
  description: `Answer several named, typed questions about one text in one call.

questions: {name: question}. A question is one of
{"type": "choice", "labels": [...] or {label: description}}: pick one;
{"type": "noul", "criteria": "text to test"}: yes or no, with the probability of yes;
{"type": "score", "levels": [ordered level names]}: one level on an ordered scale.
Every answer carries confidence, gate_basis and action (act, confirm or ask_person); see decide for
thresholds and risk. rules work across choice and score questions as in decide. The state is read once
for all prototype-scored heads. Not a reasoner.`,
  schema: {
    state: z.string(),
    questions: z.record(z.any()),
    rules: z.array(z.record(z.any())).nullable().optional(),
    thresholds: z.record(z.any()).nullable().optional(),
    risk: z.string().nullable().optional(),
  },
  run: (a) => run(a.state, a.questions, a.rules, a.thresholds, a.risk),
};
