export type ReleaseState = 'coming-soon' | 'available'

export interface SiteConfig {
  name: string
  url: string
  version: string
  platform: string
  repoUrl: string
  repoPublic: boolean
  mcpUrl: string
  release: { state: ReleaseState; downloadUrl: string }
}

export const site: SiteConfig = {
  name: 'Proton',
  url: 'https://proton-labs.vercel.app',
  version: '1.0.0',
  platform: 'Windows x64',
  repoUrl: 'https://github.com/harryx2011-boop/proton',
  repoPublic: true,
  mcpUrl: 'http://127.0.0.1:9400/mcp',
  release: { state: 'available', downloadUrl: 'https://github.com/harryx2011-boop/proton/releases/download/v1.0.0/proton.vsix' },
}

export type DownloadState = { kind: 'coming-soon' } | { kind: 'available'; href: string }

export function downloadState(config: SiteConfig): DownloadState {
  const { state, downloadUrl } = config.release
  if (state === 'available' && downloadUrl.startsWith('https://')) return { kind: 'available', href: downloadUrl }
  return { kind: 'coming-soon' }
}
