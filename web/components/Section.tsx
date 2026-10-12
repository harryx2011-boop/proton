import type { ReactNode } from 'react'
import { CropMarks } from '@/components/retro/CropMarks'

interface Props {
  id?: string
  title: string
  intro?: string
  children: ReactNode
  crop?: boolean
}

export function Section({ id, title, intro, children, crop = false }: Props) {
  return (
    <section id={id} className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-24">
      <div className={`relative ${crop ? 'px-3 py-6 md:px-5' : ''}`}>
        {crop && <CropMarks />}
        <h2 className="m-0 max-w-[60rem] text-heading tracking-heading">{title}</h2>
        {intro && <p className="m-0 mt-5 max-w-prose text-lead">{intro}</p>}
      </div>
      <div className="mt-10">{children}</div>
    </section>
  )
}
