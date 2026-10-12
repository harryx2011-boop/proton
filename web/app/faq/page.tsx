import type { Metadata } from 'next'
import { faq } from '@/lib/faq'
import { Reveal } from '@/components/Reveal'

export const metadata: Metadata = { title: 'FAQ', description: 'Short answers about what Proton runs on, privacy, trust and removal.' }

export default function Faq() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <Reveal>
        <h1 className="text-heading font-semibold tracking-tight">FAQ</h1>
        <p className="mt-4 max-w-prose text-lead text-fg-muted">Short answers to the questions people ask first.</p>
      </Reveal>
      <dl className="mt-12 max-w-prose divide-y divide-line border-y border-line">
        {faq.map((f) => (
          <div key={f.id} id={f.id} className="py-6">
            <dt className="text-title font-semibold tracking-tight">{f.question}</dt>
            <dd className="mt-2 text-body text-fg-muted">{f.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
