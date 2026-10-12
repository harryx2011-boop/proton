import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { site } from '@/site.config'

const description =
  'Proton is a small program that runs on your computer and answers quick questions for AI agents: is this text a trick, which skill fits, is this action safe.'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'Proton: Fast Local Judgment for AI Agents', template: '%s | Proton' },
  description,
  openGraph: { title: 'Proton', description, url: site.url, siteName: 'Proton', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'Proton', description },
}

export const viewport: Viewport = { themeColor: '#0a0b0e', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to Content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
