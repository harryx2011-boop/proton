export interface Note {
  lead: string
  text: string
}

export interface ChangelogSource {
  label: string
  href?: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  internal: boolean
  summary: string
  notes: Note[]
  sources: ChangelogSource[]
}

// One entry per released version, newest first. A new version is one entry at the top.
// scripts/check-changelog.mjs fails when a version in a tag, a manifest or a release has no entry.
export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-10-11',
    title: 'First Public Release',
    internal: false,
    summary:
      'Proton 1.0.0 is the first public release: a VS Code extension for Windows x64 that runs six small decision tools on your own computer. The extension file is 10.9 MB, and the three model files it needs download once, on first start.',
    notes: [
      {
        lead: 'Added.',
        text: 'The extension starts with VS Code and serves every window and every Claude Code session from one local address, 127.0.0.1:9400. It offers six tools: decide, decide_batch, locate_skill, rank, triage, and risk. The Tools and Docs page shows a real reply for each one.',
      },
      {
        lead: 'Changed.',
        text: 'Before this release the extension ran only on our own PC, as a 420.8 MB file with the models inside. The public file is 10.9 MB. It fetches the models on first start, checks each one against a stored fingerprint, and does not keep a download that fails the check.',
      },
      {
        lead: 'Security.',
        text: 'The server answers only requests addressed to localhost, refuses requests that a browser sends on behalf of a web page, and rejects any request larger than 4 MiB. Its status page now shows counts and timings, with file paths replaced by a placeholder. Text you send to Proton stays on your computer.',
      },
      {
        lead: 'Licence.',
        text: 'The code is public on GitHub under the MIT licence.',
      },
      {
        lead: 'Measured.',
        text: 'While it ran on our PC, the server used about 0.68 GB of memory (2026-10-07). In a 28-task test we wrote ourselves, the right skill came first in 24 tasks and in the top three in 27 (2026-10-06).',
      },
      {
        lead: 'Limits.',
        text: 'This release supports Windows x64 only, and the first start needs a network connection for the model download. The test has 28 tasks, so treat 24 of 28 as a rough guide. When we ran the same 28 tasks again on 2026-10-12, the right skill came first in 23 and in the top three in 26, because our list of skills had grown. Scores are comparisons, not probabilities. An audit left three smaller problems open: tool arguments have few size limits, the Python server records its process number before it opens its port, and nothing caps the number of requests per session.',
      },
    ],
    sources: [
      { label: 'GitHub release v1.0.0', href: 'https://github.com/harryx2011-boop/proton/releases/tag/v1.0.0' },
      { label: 'vscode/package.json' },
      { label: 'our project notes' },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-06',
    title: 'Three Small Models on the Processor',
    internal: false,
    summary:
      'Proton 0.2.0 replaces one large model with three small ones that run on the processor alone, so the server no longer needs a graphics card. On our 28-task test the right skill now comes first in 24 tasks, up from 19.',
    notes: [
      {
        lead: 'Changed.',
        text: 'The earlier model, GLiNER2.5-Decide, ran on the graphics card. Its replacements are SKILLRET-Edge-109M, which finds the right skill for a task; e5-base-v2, which compares text with labels; and gliclass-base-v3.0, which answers every other label question. All three are compressed copies built to run on the processor.',
      },
      {
        lead: 'Measured.',
        text: 'On 2026-10-06 on our PC, with the same 28 hand-written tasks, the right skill came first in 24 (19 before) and in the top three in 27 (24 before). The server held 1.25 GB of private memory and stayed flat over 400 calls, where the earlier build used between 4.5 GB and 11.9 GB. The median time for a decide call through the local server was 51 ms, measured while another session was using the processor.',
      },
      {
        lead: 'Changed.',
        text: 'The hidden-instructions check, which looks for text that tries to steer an AI agent, now compares each text with example labels. On a sample of 6 texts, the two real injections scored 0.975 and 0.893, and ordinary documents scored 0.312 or lower.',
      },
      {
        lead: 'Limits.',
        text: 'Both test sets are small and written by us: 28 skill tasks and 6 injection texts. The source is public only from 1.0.0. The version number stayed 0.2.0 through later changes to the Python server, including a generic state folder and the MIT licence on 2026-10-11.',
      },
    ],
    sources: [{ label: 'pyproject.toml' }, { label: 'our project notes' }],
  },
  {
    version: '0.1.0',
    date: '2026-10-02',
    title: 'First Working Server, Never Published',
    internal: true,
    summary:
      'Proton 0.1.0 was the first working server, built on 2026-10-02 around one model, GLiNER2.5-Decide, on a graphics card. It ran on one PC and was never published, so nobody outside our team could install it.',
    notes: [
      {
        lead: 'Added.',
        text: 'One tool, decide, took a piece of text, a set of labels, and optional rules such as "if this label, then not that one". It returned the best label with a confidence score. On 2026-10-03 we added a shared server so every Claude Code session used one copy, and on 2026-10-05 the four task tools: locate_skill, rank, triage, and risk. The version number stayed 0.1.0 through all three changes.',
      },
      {
        lead: 'Measured.',
        text: 'On 2026-10-02, on a shared RTX 2070 SUPER, with a 110-character prompt, two label sets, and one rule, the median time was 50.4 ms (40 runs after 5 warm-up runs). On the processor alone it was 385 ms.',
      },
      {
        lead: 'What broke.',
        text: 'On 2026-10-06 the server grew to 11.9 GB of private memory while a game held the graphics card, and one locate_skill call gave no reply for 300 seconds. Long, varied inputs to that tool made the graphics memory manager keep a new block for each input shape. We switched the server off that day, and 0.2.0 is its replacement.',
      },
      {
        lead: 'Limits.',
        text: 'Accuracy was never sampled for this version. The model maker reports 60.1% on its own 17-dataset test suite, and we did not reproduce that figure.',
      },
    ],
    sources: [{ label: 'pyproject.toml' }, { label: 'our project notes' }],
  },
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}
