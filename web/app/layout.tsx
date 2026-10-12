import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { BootLoader } from '@/components/retro/BootLoader'
import { site } from '@/site.config'

// Inter Tight carries the headline and the lead, so it is preloaded with a size-matched fallback (no late swap).
const interTight = localFont({
  src: './fonts/inter-tight-ascii.woff2',
  variable: '--font-inter-tight',
  weight: '100 900',
  display: 'swap',
  adjustFontFallback: 'Arial',
})

const vt323 = localFont({ src: './fonts/vt323-ascii.woff2', variable: '--font-vt323', weight: '400', display: 'swap', preload: false })

const jetbrainsMono = localFont({ src: './fonts/jetbrains-mono-ascii.woff2', variable: '--font-jetbrains', weight: '100 800', display: 'swap', preload: false })

const description =
  'Proton is a small program that runs on your computer and answers quick questions for AI agents: is this text a trick, which skill fits, is this action safe.'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'Proton: Fast Local Judgment for AI Agents', template: '%s | Proton' },
  description,
  openGraph: { title: 'Proton', description, url: site.url, siteName: 'Proton', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Proton', description },
}

export const viewport: Viewport = { themeColor: '#8fb0ff', colorScheme: 'light' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${vt323.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to Content
        </a>
        <BootLoader />
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
