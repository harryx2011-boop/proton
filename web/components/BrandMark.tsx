import { BRANDS, brandFile, type BrandSlug } from '@/lib/brands'

// A mark beside its name is decorative (alt=""); a mark on its own passes `alone` and is named.
export function BrandMark({ slug, size = 20, alone = false, className = '' }: { slug: BrandSlug; size?: number; alone?: boolean; className?: string }) {
  const { name, mono } = BRANDS[slug]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brands/${brandFile(slug)}`}
      alt={alone ? name : ''}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 object-contain ${mono ? 'brightness-0' : ''} ${className}`}
    />
  )
}
