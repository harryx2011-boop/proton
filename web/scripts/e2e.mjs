// Visual and accessibility check against a running site: node scripts/e2e.mjs <baseUrl> <outDir>
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdirSync } from 'node:fs'

const [base = 'http://127.0.0.1:5800', out = './e2e-out'] = process.argv.slice(2)
const pages = ['/', '/download', '/docs', '/benchmarks', '/changelog', '/faq']
const widths = [390, 1440]
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
let failures = 0
for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
    const name = `${path === '/' ? 'home' : path.slice(1)}-${width}`
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true })
    const bad = axe.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} -> ${v.nodes[0].target.join(' ')} | ${(v.nodes[0].failureSummary || '').split('\n').slice(1, 3).join(' ')}`)
    if (overflow > 0) {
      bad.push(`horizontal overflow ${overflow}px`)
      const wide = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .slice(0, 4)
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 60)} right=${Math.round(e.getBoundingClientRect().right)}`),
      )
      bad.push(...wide)
    }
    if (bad.length) failures += bad.length
    console.log(`${name}: ${bad.length ? 'FAIL' : 'ok'}`, ...bad)
  }
  await ctx.close()
}
const h1Opaque = () => {
  let e = document.querySelector('h1')
  if (!e) return false
  for (; e; e = e.parentElement) if (getComputedStyle(e).opacity !== '1') return false
  return true
}
for (const js of [true, false]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, javaScriptEnabled: js })
  const page = await ctx.newPage()
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'load' })
    await page.waitForTimeout(900)
    const ok = await page.evaluate(h1Opaque)
    if (!ok) failures++
    console.log(`h1 visible (${js ? 'js on' : 'js off'}) ${path}: ${ok ? 'ok' : 'FAIL'}`)
  }
  await ctx.close()
}

// 1-bit look guards: no element may carry a CSS invert filter (Tailwind's `invert` utility collides with ours)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  for (const path of pages) {
    await page.goto(base + path, { waitUntil: 'networkidle' })
    const bad = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).filter.includes('invert')).length)
    if (bad) failures++
    console.log(`no invert filter ${path}: ${bad ? `FAIL (${bad} elements)` : 'ok'}`)
  }
  await ctx.close()
}

// Hero motion: words really animate with motion on, and sit at their end state at once with reduced motion
{
  const word = () => {
    const el = document.querySelector('h1 .rise-word')
    return el ? Number(getComputedStyle(el).opacity) : -1
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(base + '/', { waitUntil: 'commit' })
  await page.waitForSelector('h1 .rise-word')
  await page.screenshot({ path: `${out}/hero-motion-0.png` })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/hero-motion-1.png` })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${out}/hero-motion-2.png` })
  const last = await page.evaluate(word)
  if (last !== 1) failures++
  console.log(`hero words end opaque with motion: ${last === 1 ? 'ok' : `FAIL (${last})`}`)
  await ctx.close()

  const calm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
  const p2 = await calm.newPage()
  await p2.goto(base + '/', { waitUntil: 'commit' })
  await p2.waitForSelector('h1 .rise-word')
  const first = await p2.evaluate(word)
  await p2.screenshot({ path: `${out}/hero-reduced.png` })
  if (first !== 1) failures++
  console.log(`hero words opaque at once with reduced motion: ${first === 1 ? 'ok' : `FAIL (${first})`}`)
  await calm.close()
}

// Draggable windows: a title bar drag moves the window, a click raises it
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(base + '/', { waitUntil: 'networkidle' })
  const bar = (id) => page.locator(`[data-window="${id}"] .win-bar`)
  await bar('decide').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const before = await bar('decide').boundingBox()
  await page.mouse.move(before.x + 120, before.y + 14)
  await page.mouse.down()
  await page.mouse.move(before.x + 240, before.y + 74, { steps: 6 })
  await page.mouse.up()
  const after = await bar('decide').boundingBox()
  const moved = Math.round(after.x - before.x) >= 100 && Math.round(after.y - before.y) >= 40
  if (!moved) failures++
  console.log(`window drag moves it (${Math.round(after.x - before.x)}, ${Math.round(after.y - before.y)}): ${moved ? 'ok' : 'FAIL'}`)

  await bar('risk').click()
  const z = await page.evaluate(() => {
    const zi = (id) => Number(getComputedStyle(document.querySelector(`[data-window="${id}"]`)).zIndex)
    return { risk: zi('risk'), decide: zi('decide') }
  })
  const raised = z.risk > z.decide
  if (!raised) failures++
  console.log(`clicked window comes to the front (risk ${z.risk} over decide ${z.decide}): ${raised ? 'ok' : 'FAIL'}`)

  await bar('rank').focus()
  const k0 = await bar('rank').boundingBox()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  const k1 = await bar('rank').boundingBox()
  const keyed = Math.round(k1.x - k0.x) === 20
  if (!keyed) failures++
  console.log(`arrow keys move a focused window by 10px (${Math.round(k1.x - k0.x)}px for two presses): ${keyed ? 'ok' : 'FAIL'}`)
  await ctx.close()
}
await browser.close()
process.exit(failures ? 1 : 0)
