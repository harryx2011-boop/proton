const toBase64 = (s: string) => (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'utf8').toString('base64'))
const fromBase64 = (s: string) => (typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('utf8'))

export function encodeMarginCode(words: string[], repeat: number): string {
  return toBase64(Array(repeat).fill(words.join(' ')).join(' '))
}

export function decodeMarginCode(code: string): string {
  return fromBase64(code)
}
