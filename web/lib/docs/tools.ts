import fixture from '@/fixtures/demo.json'
import { examples } from '@/lib/demo/examples'
import { docCalls } from './calls'

export interface Arg {
  name: string
  type: string
  note: string
  optional?: boolean
}

export interface Tool {
  name: string
  title: string
  summary: string
  when: string
  args: Arg[]
  exampleCall: string
  exampleReply: string
}

const show = (value: unknown) => JSON.stringify(value, null, 2)
const demo = (id: string) => ({
  args: examples.find((e) => e.id === id)!.args,
  reply: fixture.examples.find((e) => e.id === id)!.reply,
})

const HEADS: Arg = { name: 'heads', type: 'object', note: 'Each question you want answered: a name, then the labels to choose from. A label can carry a short description.' }
const RULES: Arg = { name: 'rules', type: 'list', note: 'Optional limits between answers, such as "if this label, then that one". Applied after scoring.', optional: true }

const make = (name: string, title: string, summary: string, when: string, args: Arg[], call: unknown, reply: unknown): Tool => ({
  name,
  title,
  summary,
  when,
  args,
  exampleCall: show({ tool: name, arguments: call }),
  exampleReply: show(reply),
})

const injection = demo('injection')
const routing = demo('routing')
const risk = demo('risk')
const triage = demo('triage')

export const tools: Tool[] = [
  make(
    'decide',
    'Decide',
    'Reads one piece of text and picks the best label for each question you ask about it.',
    'Use it for any quick yes or no, or a choice from a short list: is this text trying to give hidden orders, is this a bug or a feature.',
    [{ name: 'text', type: 'string', note: 'The text to judge.' }, HEADS, RULES],
    injection.args,
    injection.reply,
  ),
  make(
    'decide_batch',
    'Decide Batch',
    'The same as Decide, for many texts in one call.',
    'Use it when you have a list to label, such as a day of incoming messages.',
    [{ name: 'texts', type: 'list', note: 'The texts to judge.' }, HEADS, RULES],
    { ...docCalls.decide_batch },
    fixture.docs.decide_batch,
  ),
  make(
    'locate_skill',
    'Locate Skill',
    'Finds the skills or agents that best fit a task, from a catalog of your own.',
    'Use it to decide which tool an AI agent should reach for before it starts.',
    [
      { name: 'task', type: 'string', note: 'What you want done, in plain words.' },
      { name: 'top_k', type: 'number', note: 'How many picks to return. The default is 3.', optional: true },
      { name: 'kinds', type: 'list', note: 'Limit the search to skills or to agents.', optional: true },
      { name: 'project', type: 'string', note: 'Add the skills that belong to one project.', optional: true },
    ],
    routing.args,
    routing.reply,
  ),
  make(
    'rank',
    'Rank',
    'Orders texts by how close each one is in topic to a description you give.',
    'Use it to find the most relevant items first. It measures closeness of topic, not urgency or quality.',
    [
      { name: 'texts', type: 'list', note: 'The texts to order.' },
      { name: 'criterion', type: 'string', note: 'What you are looking for.' },
    ],
    { ...docCalls.rank },
    fixture.docs.rank,
  ),
  make(
    'triage',
    'Triage',
    'Sorts a list of items into the buckets you name.',
    'Use it to route issues, messages or notes to the right place.',
    [
      { name: 'items', type: 'list', note: 'The items to sort.' },
      { name: 'labels', type: 'list or object', note: 'Bucket names, or bucket names with a short description each.' },
    ],
    triage.args,
    triage.reply,
  ),
  make(
    'risk',
    'Risk',
    'Rates an action as read, write, send or destructive.',
    'Use it as a first check before an agent acts. It is a quick signal, not a guard: pair it with real safeguards.',
    [
      { name: 'action_name', type: 'string', note: 'The command or tool name.' },
      { name: 'args_summary', type: 'string', note: 'A short description of what it will act on.' },
    ],
    risk.args,
    risk.reply,
  ),
]
