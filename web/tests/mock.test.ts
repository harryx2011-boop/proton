import { describe, expect, it } from 'vitest'
import { CMD_CLAUDE, CMD_INSTALL, CMD_LIST, CMD_MCP, FRAMES, INITIAL, STARTS, cumulative, typeBeats } from '@/lib/mock/script'
import { site } from '@/site.config'

describe('cumulative', () => {
  it('turns delays after the previous beat into start times from the first beat', () => {
    expect(cumulative([0, 100, 250, 50])).toEqual([0, 100, 350, 400])
    expect(cumulative([])).toEqual([])
  })
})

describe('typeBeats', () => {
  it('types in chunks and ends on the whole text', () => {
    const b = typeBeats('c1', 'abcdefg', 500, 3, 80)
    expect(b.map((x) => x.patch.c1)).toEqual([3, 6, 7])
    expect(b.map((x) => x.after)).toEqual([500, 80, 80])
  })
})

describe('install script', () => {
  it('has one start time per frame, in order, from zero', () => {
    expect(STARTS).toHaveLength(FRAMES.length)
    expect(STARTS[0]).toBe(0)
    STARTS.forEach((t, i) => i > 0 && expect(t).toBeGreaterThanOrEqual(STARTS[i - 1]))
  })

  it('starts empty: nothing typed, extension not installed', () => {
    expect(FRAMES[0]).toEqual(INITIAL)
    expect(INITIAL.phase).toBe('off')
    expect(INITIAL.installed).toBe(false)
  })

  it('ends on the settled screen: every command typed, server ready, one decision shown', () => {
    const f = FRAMES[FRAMES.length - 1]
    expect([f.c1, f.c2, f.c3, f.c4]).toEqual([CMD_INSTALL.length, CMD_MCP.length, CMD_LIST.length, CMD_CLAUDE.length])
    expect(f.installed).toBe(true)
    expect(f.view).toBe('proton')
    expect(f.phase).toBe('ready')
    expect(f.percent).toBe(100)
    expect(f.listOut).toBe(2)
    expect(f.decision).toBe(true)
  })

  it('never goes backwards: typed counts and percent only grow, phases follow the real order', () => {
    const order = ['off', 'starting', 'downloading', 'ready']
    for (let i = 1; i < FRAMES.length; i++) {
      const a = FRAMES[i - 1]
      const b = FRAMES[i]
      for (const k of ['c1', 'c2', 'c3', 'c4', 'percent', 'installOut', 'listOut'] as const) expect(b[k]).toBeGreaterThanOrEqual(a[k])
      expect(order.indexOf(b.phase)).toBeGreaterThanOrEqual(order.indexOf(a.phase))
    }
  })

  it('shows the real install and connect commands', () => {
    expect(CMD_INSTALL).toBe('code --install-extension proton.vsix')
    expect(CMD_MCP).toBe(`claude mcp add --transport http -s user proton ${site.mcpUrl}`)
  })
})
