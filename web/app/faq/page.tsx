import type { Metadata } from 'next'
import { faq } from '@/lib/faq'
import { Accordion } from '@/components/faq/Accordion'

export const metadata: Metadata = { title: 'FAQ', description: 'Short answers about what Proton runs on, privacy, trust and removal.' }

export default function Faq() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <noscript>
        <style>{'.faq-panel{grid-template-rows:1fr !important;visibility:visible !important}'}</style>
      </noscript>
      <h1 className="m-0 text-heading tracking-heading">FAQ</h1>
      <p className="m-0 mt-5 max-w-prose text-lead">Short answers to the questions people ask first.</p>
      <div className="mt-10 max-w-3xl">
        <Accordion items={faq} />
      </div>
    </div>
  )
}
