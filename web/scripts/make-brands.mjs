// Bundles real brand marks into public/brands/<slug>.svg from icon-kit's offline kits (logos, then simple-icons).
// The logos skill's chain is Iconify set, then the company's own logo, then a favicon; this script covers step 1.
// A brand with no hit is listed so it can be sourced by hand. Check each file by eye before using it.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const KITS = process.env.ICON_KIT_DIR
if (!KITS) throw new Error('Set ICON_KIT_DIR to the folder of Iconify kit JSON files (icon-kit: packages/core/kits).')
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const cfg = JSON.parse(readFileSync(here('./brands.config.json'), 'utf8'))
const cache = {}
const kit = (k) => (cache[k] ??= JSON.parse(readFileSync(`${KITS}/${k}.json`, 'utf8')))

mkdirSync(here('../public/brands'), { recursive: true })
const misses = []
for (const [slug, b] of Object.entries(cfg.brands)) {
  let done = false
  // The company's own mark, taken from its site (step 2 of the logos chain). Slow to refetch, so an existing file is kept.
  if (b.fetch) {
    const ext = b.fetch.split('?')[0].split('.').pop()
    const out = here(`../public/brands/${slug}.${ext}`)
    if (!existsSync(out)) {
      const res = await fetch(b.fetch)
      if (!res.ok) throw new Error(`${slug}: ${b.fetch} answered ${res.status}`)
      writeFileSync(out, Buffer.from(await res.arrayBuffer()))
    }
    console.log(`${slug.padEnd(12)} <- ${b.fetch}`)
    continue
  }
  for (const ref of b.from) {
    const [k, id] = ref.split(':')
    const data = kit(k)
    const icon = data.icons[id]
    if (!icon) continue
    const w = icon.width ?? data.width ?? 24
    const h = icon.height ?? data.height ?? 24
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body}</svg>\n`
    writeFileSync(here(`../public/brands/${slug}.svg`), svg)
    console.log(`${slug.padEnd(12)} <- ${ref} (${svg.length} bytes)`)
    done = true
    break
  }
  if (!done) misses.push(slug)
}
if (misses.length) console.log(`no hit in the offline kits: ${misses.join(', ')}`)
