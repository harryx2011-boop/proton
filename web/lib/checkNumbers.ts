import type { Measured } from './numbers'

export function checkNumbers(list: Measured[], read: (file: string) => string): string[] {
  const errors: string[] = []
  const cache = new Map<string, string>()
  for (const n of list) {
    let text = cache.get(n.source.file)
    if (text === undefined) {
      try {
        text = read(n.source.file)
      } catch {
        errors.push(`${n.id}: cannot read ${n.source.file}`)
        continue
      }
      cache.set(n.source.file, text)
    }
    if (!text.includes(n.source.match)) errors.push(`${n.id}: "${n.source.match}" not found in ${n.source.file}`)
    else if (!n.source.match.includes(String(n.value))) errors.push(`${n.id}: value ${n.value} not in its source snippet`)
  }
  return errors
}
