// Fails when a released version (git tag, manifest version past or present, GitHub release) has no changelog entry,
// or when the changelog is not newest first. Run from web/: npm run check:changelog
// web/package.json is left out on purpose: it versions the website, not Proton.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { changelog } from '../lib/changelog.ts'
import { checkChangelog } from '../lib/checkChangelog.ts'
import { site } from '../site.config.ts'

const root = fileURLToPath(new URL('../../', import.meta.url))
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 })

const found = []
const add = (version, source) => found.push({ version, source })
const SEMVER = /^v?(\d+\.\d+\.\d+)$/

for (const tag of run('git', ['tag', '-l']).split('\n')) {
  const m = SEMVER.exec(tag.trim())
  if (m) add(m[1], `git tag ${tag.trim()}`)
}

const manifests = [
  { file: 'pyproject.toml', current: /^version\s*=\s*"(\d+\.\d+\.\d+)"/m, added: /^\+version\s*=\s*"(\d+\.\d+\.\d+)"/gm },
  { file: 'vscode/package.json', current: /^ {2}"version":\s*"(\d+\.\d+\.\d+)"/m, added: /^\+ {2}"version":\s*"(\d+\.\d+\.\d+)"/gm },
]
for (const { file, current, added } of manifests) {
  const now = current.exec(run('git', ['show', `HEAD:${file}`]))
  if (now) add(now[1], `${file} (HEAD)`)
  for (const m of run('git', ['log', '-p', '--format=', '--', file]).matchAll(added)) add(m[1], `${file} (history)`)
}

try {
  const repo = new URL(site.repoUrl).pathname.slice(1)
  for (const r of JSON.parse(run('gh', ['release', 'list', '-R', repo, '--json', 'tagName']))) {
    const m = SEMVER.exec(r.tagName)
    if (m) add(m[1], `GitHub release ${r.tagName}`)
  }
} catch {
  console.warn('check-changelog: GitHub releases not checked (gh unavailable or offline)')
}

const unique = new Map()
for (const f of found) unique.set(f.version, unique.get(f.version) ? `${unique.get(f.version)}, ${f.source}` : f.source)
const list = [...unique].map(([version, source]) => ({ version, source }))

const errors = checkChangelog(changelog, list)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`check-changelog: ${list.length} versions found (${list.map((f) => f.version).sort().join(', ')}); ${changelog.length} entries, newest first`)
