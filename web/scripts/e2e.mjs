// Visual and accessibility check against a running site: node scripts/e2e.mjs <baseUrl> <outDir>
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdirSync } from 'node:fs'

const [base = 'http://127.0.0.1:5800', out = './e2e-out'] = process.argv.slice(2)
const pages = ['/', '/download', '/docs', '/benchmarks', '/faq']
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
await browser.close()
process.exit(failures ? 1 : 0)
