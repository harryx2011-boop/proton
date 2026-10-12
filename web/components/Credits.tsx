import { credits } from '@/lib/credits'
import { Window } from '@/components/retro/Window'
import { BrandMark } from '@/components/BrandMark'

export function Credits() {
  return (
    <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
      {credits.map((c) => (
        <li key={c.name} className="min-w-0">
          <Window title={c.window} className="flex h-full flex-col" bodyClassName="flex flex-1 flex-col p-4">
            <h3 className="m-0 break-words font-pixel text-pixel-lg font-normal">{c.name}</h3>
            <p className="m-0 mt-2 text-body">{c.use}</p>
            <dl className="m-0 mt-5 border-t border-ink text-caption">
              <div className="flex min-h-11 items-center gap-3 border-b border-ink">
                <dt className="w-24 shrink-0 font-pixel text-pixel">By</dt>
                <dd className="m-0 min-w-0">
                  <a href={c.byHref} rel="noopener noreferrer" className="flip biglink inline-flex min-h-11 items-center gap-2 px-1 font-medium">
                    {c.byMark ? <BrandMark slug={c.byMark} size={20} /> : null}
                    {c.by}
                  </a>
                </dd>
              </div>
              <div className="flex min-h-11 items-center gap-3 border-b border-ink">
                <dt className="w-24 shrink-0 font-pixel text-pixel">Hosted On</dt>
                <dd className="m-0 flex items-center gap-2 px-1 font-medium">
                  <BrandMark slug="huggingface" size={20} />
                  Hugging Face
                </dd>
              </div>
            </dl>
            <p className="m-0 mt-auto pt-4">
              <a href={c.href} rel="noopener noreferrer" className="flip biglink inline-flex min-h-11 items-center px-1 text-body font-medium">
                Model Page
              </a>
            </p>
          </Window>
        </li>
      ))}
    </ul>
  )
}
