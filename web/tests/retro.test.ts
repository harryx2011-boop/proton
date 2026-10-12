import { describe, expect, it } from 'vitest'
import { arrowDelta, bringToFront, clampPosition } from '@/lib/retro/drag'
import { bootProgress, shouldShowBoot } from '@/lib/retro/boot'
import { decodeMarginCode, encodeMarginCode } from '@/lib/retro/marginCode'

describe('clampPosition', () => {
  const bounds = { w: 1000, h: 600 }
  it('keeps a window inside its desktop', () => {
    expect(clampPosition({ x: -40, y: -10 }, { w: 300, h: 200 }, bounds)).toEqual({ x: 0, y: 0 })
    expect(clampPosition({ x: 900, y: 590 }, { w: 300, h: 200 }, bounds)).toEqual({ x: 700, y: 400 })
    expect(clampPosition({ x: 120, y: 80 }, { w: 300, h: 200 }, bounds)).toEqual({ x: 120, y: 80 })
  })
  it('pins a window larger than the desktop to the top left', () => {
    expect(clampPosition({ x: 50, y: 50 }, { w: 1200, h: 800 }, bounds)).toEqual({ x: 0, y: 0 })
  })
})

describe('bringToFront', () => {
  it('moves the chosen id to the end without touching the others', () => {
    expect(bringToFront(['a', 'b', 'c'], 'a')).toEqual(['b', 'c', 'a'])
    expect(bringToFront(['a', 'b', 'c'], 'c')).toEqual(['a', 'b', 'c'])
  })
  it('adds an unknown id at the front of the stack', () => {
    expect(bringToFront(['a'], 'z')).toEqual(['a', 'z'])
  })
})

describe('arrowDelta', () => {
  it('moves 10 px per arrow and 40 px with shift', () => {
    expect(arrowDelta('ArrowLeft', false)).toEqual({ x: -10, y: 0 })
    expect(arrowDelta('ArrowDown', true)).toEqual({ x: 0, y: 40 })
  })
  it('ignores other keys', () => {
    expect(arrowDelta('Enter', false)).toBeNull()
  })
})

describe('boot loader', () => {
  it('reports real progress as done over total', () => {
    expect(bootProgress(0, 4)).toBe(0)
    expect(bootProgress(3, 4)).toBe(75)
    expect(bootProgress(9, 4)).toBe(100)
    expect(bootProgress(1, 0)).toBe(100)
  })
  it('shows only when loading is slow, once per session, and never for reduced motion', () => {
    const base = { elapsedMs: 400, seen: false, reduced: false, done: false }
    expect(shouldShowBoot(base)).toBe(true)
    expect(shouldShowBoot({ ...base, elapsedMs: 100 })).toBe(false)
    expect(shouldShowBoot({ ...base, seen: true })).toBe(false)
    expect(shouldShowBoot({ ...base, reduced: true })).toBe(false)
    expect(shouldShowBoot({ ...base, done: true })).toBe(false)
  })
})

describe('margin code', () => {
  const words = ['decide', 'decide_batch', 'locate_skill', 'rank', 'triage', 'risk']
  it('is plain base64 that decodes back to Proton tool names', () => {
    const code = encodeMarginCode(words, 3)
    expect(code).toMatch(/^[A-Za-z0-9+/=]+$/)
    expect(decodeMarginCode(code)).toBe(Array(3).fill(words.join(' ')).join(' '))
  })
  it('is deterministic', () => {
    expect(encodeMarginCode(words, 2)).toBe(encodeMarginCode(words, 2))
  })
})
