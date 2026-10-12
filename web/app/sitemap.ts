import type { MetadataRoute } from 'next'
import { site } from '@/site.config'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/download', '/docs', '/benchmarks', '/changelog', '/faq'].map((path) => ({ url: `${site.url}${path}` }))
}
