import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { numbers } from '@/lib/numbers'
import { checkNumbers } from '@/lib/checkNumbers'

const read = (file: string) => readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')

describe('measured numbers', () => {
  it('every number matches its source line in the repo docs', () => {
    expect(checkNumbers(numbers, read)).toEqual([])
  })

  it('reports a number that no longer matches its source', () => {
    const bad = [{ ...numbers[0], source: { file: numbers[0].source.file, match: 'this text is not in the file' } }]
    expect(checkNumbers(bad, read)).toHaveLength(1)
  })

  it('every number names its test date', () => {
    for (const n of numbers) expect(n.measured).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
