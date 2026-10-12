// Draws Proton's atom and soft clouds in Chromium, samples them on a grid and writes a 1-bit halftone SVG.
// Run once: CHROME_PATH=<chrome.exe> node scripts/make-halftone.mjs
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const W = 1280
const H = 420
const STEP = 8

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined })
const page = await browser.newPage({ viewport: { width: W, height: H } })
const alpha = await page.evaluate(
  ({ W, H }) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')
    g.filter = 'blur(10px)'
    g.fillStyle = '#000'
    // soft clouds, left and right
    for (const [x, y, rx, ry, a] of [
      [150, 120, 190, 110, 0.55],
      [280, 300, 150, 80, 0.4],
      [1130, 100, 200, 100, 0.5],
      [1000, 320, 170, 90, 0.45],
    ]) {
      const grad = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
      grad.addColorStop(0, `rgba(0,0,0,${a})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.save()
      g.translate(x, y)
      g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry))
      g.translate(-x, -y)
      g.fillStyle = grad
      g.beginPath()
      g.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    // the atom: three orbits, nucleus, three electrons
    g.filter = 'blur(4px)'
    const cx = W / 2
    const cy = H / 2
    g.strokeStyle = '#000'
    // two crossing orbits, like Proton's own mark (not three: that would echo another logo)
    g.lineWidth = 13
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      g.beginPath()
      g.ellipse(cx, cy, 235, 88, a, 0, Math.PI * 2)
      g.stroke()
    }
    g.fillStyle = '#000'
    g.beginPath()
    g.arc(cx, cy, 30, 0, Math.PI * 2)
    g.fill()
    for (const [a, t] of [
      [Math.PI / 4, 0.18],
      [-Math.PI / 4, 0.68],
    ]) {
      const ex = 235 * Math.cos(t * Math.PI * 2)
      const ey = 88 * Math.sin(t * Math.PI * 2)
      const x = cx + ex * Math.cos(a) - ey * Math.sin(a)
      const y = cy + ex * Math.sin(a) + ey * Math.cos(a)
      g.beginPath()
      g.arc(x, y, 17, 0, Math.PI * 2)
      g.fill()
    }
    const data = g.getImageData(0, 0, W, H).data
    return Array.from(data.filter((_, i) => i % 4 === 3))
  },
  { W, H },
)
await browser.close()

const circles = []
for (let y = STEP / 2; y < H; y += STEP) {
  for (let x = STEP / 2; x < W; x += STEP) {
    const a = alpha[Math.floor(y) * W + Math.floor(x)] / 255
    const r = Math.round((0.5 + a * 3.3) * 2.5) / 2.5
    if (a > 0.07) circles.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}"/>`)
  }
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" fill="#111111"><g>${circles.join('')}</g></svg>\n`
const out = fileURLToPath(new URL('../public/art/atom-halftone.svg', import.meta.url))
mkdirSync(fileURLToPath(new URL('../public/art', import.meta.url)), { recursive: true })
writeFileSync(out, svg)
console.log(`${circles.length} dots, ${(svg.length / 1024).toFixed(0)} KB`)
