// Real brand marks, bundled in public/brands (made by scripts/make-brands.mjs from icon-kit's offline kits, or from the company's own site for ThakiCloud and Knowledgator, which no kit has).
// mono: the mark is natively single colour and may sit in ink. Add a brand: one line here, one in scripts/brands.config.json.
export const BRANDS = {
  vscode: { name: 'VS Code', mono: false },
  'claude-code': { name: 'Claude Code', mono: false },
  windows: { name: 'Windows', mono: false },
  ollama: { name: 'Ollama', mono: true },
  github: { name: 'GitHub', mono: true },
  mcp: { name: 'Model Context Protocol', mono: true },
  huggingface: { name: 'Hugging Face', mono: false },
  qwen: { name: 'Qwen', mono: false },
  python: { name: 'Python', mono: false },
  typescript: { name: 'TypeScript', mono: false },
  thakicloud: { name: 'ThakiCloud', mono: false },
  knowledgator: { name: 'Knowledgator', mono: false, ext: 'ico' },
} as const satisfies Record<string, { name: string; mono: boolean; ext?: 'svg' | 'ico' }>

export const brandFile = (slug: BrandSlug) => `${slug}.${(BRANDS[slug] as { ext?: string }).ext ?? 'svg'}`

export type BrandSlug = keyof typeof BRANDS
