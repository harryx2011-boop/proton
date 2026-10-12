const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'for', 'on', 'in', 'to', 'at', 'by', 'with', 'vs', 'as', 'is', 'per'])

export function isTitleCase(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean)
  return words.every((word, i) => {
    const bare = word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
    if (!bare || !/[A-Za-z]/.test(bare[0])) return true
    if (i > 0 && SMALL.has(bare.toLowerCase())) return true
    return bare[0] === bare[0].toUpperCase()
  })
}
