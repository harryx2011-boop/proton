import type { Metadata } from 'next'
import { changelog, formatDate } from '@/lib/changelog'
import { Window } from '@/components/retro/Window'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Every Proton version, newest first, with its date and what changed for you.',
}

const heading = 'm-0 font-pixel text-pixel-lg font-normal'

export default function Changelog() {
  return (
    <div className="mx-auto max-w-page px-4 py-16 md:px-6 md:py-20">
      <h1 className="m-0 text-heading tracking-heading">Changelog</h1>
      <p className="m-0 mt-5 max-w-prose text-lead">
        Every version of Proton, newest first, with the date it shipped and what changed for you. Version 1.0.0 is the VS Code extension. Versions 0.2.0 and 0.1.0 are the Python server that came before it.
      </p>

      <ol className="m-0 mt-10 flex max-w-3xl list-none flex-col gap-8 p-0">
        {changelog.map((e) => (
          <li key={e.version} id={`v${e.version.replaceAll('.', '-')}`} className="scroll-mt-16">
            <Window title={`Proton ${e.version}`} bodyClassName="flex flex-col gap-4 p-4 md:p-8">
              <h2 className={heading}>
                {e.version}: {e.title}
              </h2>
              <p className="m-0 text-caption">
                <time dateTime={e.date}>{formatDate(e.date)}</time>
                {e.internal ? '. Internal build, never published.' : ''}
              </p>
              <p className="m-0 max-w-prose text-body">{e.summary}</p>
              {e.notes.map((n) => (
                <p key={n.lead} className="m-0 max-w-prose text-body">
                  <strong className="font-semibold">{n.lead}</strong> {n.text}
                </p>
              ))}
              <p className="m-0 flex flex-wrap items-center gap-x-1 text-caption">
                <span>Source:</span>
                {e.sources.map((s, i) => (
                  <span key={s.label} className="inline-flex items-center">
                    {s.href ? (
                      <a href={s.href} className="flip biglink flex min-h-11 items-center px-1 underline">
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                    {i < e.sources.length - 1 ? ',' : '.'}
                  </span>
                ))}
              </p>
            </Window>
          </li>
        ))}
      </ol>
    </div>
  )
}
