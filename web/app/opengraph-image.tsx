import { ImageResponse } from 'next/og'

export const alt = 'Proton'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0b0e', color: '#eef0f4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="#4f86ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1" />
            <path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z" />
            <path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z" />
          </svg>
          <div style={{ fontSize: 144, fontWeight: 700, letterSpacing: -4 }}>Proton</div>
        </div>
      </div>
    ),
    size,
  )
}
