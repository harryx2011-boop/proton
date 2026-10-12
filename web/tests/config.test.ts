import { describe, expect, it } from 'vitest'
import { downloadState, site } from '@/site.config'

describe('downloadState', () => {
  it('is coming soon with no link until a release exists', () => {
    expect(downloadState({ ...site, release: { state: 'coming-soon', downloadUrl: '' } })).toEqual({ kind: 'coming-soon' })
  })

  it('links the release when available', () => {
    const url = 'https://github.com/harryx2011-boop/proton/releases/download/v1.0.0/proton.vsix'
    expect(downloadState({ ...site, release: { state: 'available', downloadUrl: url } })).toEqual({ kind: 'available', href: url })
  })

  it('never links a non-https or empty release url', () => {
    expect(downloadState({ ...site, release: { state: 'available', downloadUrl: '' } })).toEqual({ kind: 'coming-soon' })
    expect(downloadState({ ...site, release: { state: 'available', downloadUrl: 'javascript:alert(1)' } })).toEqual({ kind: 'coming-soon' })
  })

  it('states the single supported platform plainly', () => {
    expect(site.platform).toBe('Windows x64')
  })
})
