import type { BrandSlug } from '@/lib/brands'

export interface Credit {
  name: string
  by: string
  /** The author's own mark, where the author has one. intfloat is a person's account with no logo. */
  byMark?: BrandSlug
  byHref: string
  use: string
  href: string
  /** Title bar of the credit window */
  window: string
}

export const credits: Credit[] = [
  {
    name: 'SKILLRET-Edge-109M',
    by: 'ThakiCloud',
    byMark: 'thakicloud',
    byHref: 'https://huggingface.co/ThakiCloud',
    use: 'Finds the right skill for a task.',
    href: 'https://huggingface.co/ThakiCloud/SKILLRET-Edge-109M',
    window: 'Skill.Finder',
  },
  {
    name: 'e5-base-v2',
    by: 'intfloat',
    byHref: 'https://huggingface.co/intfloat',
    use: 'Compares text with labels, for Rank, Triage, Risk and hidden instructions.',
    href: 'https://huggingface.co/intfloat/e5-base-v2',
    window: 'Text.Compare',
  },
  {
    name: 'gliclass-base-v3.0',
    by: 'Knowledgator',
    byMark: 'knowledgator',
    byHref: 'https://huggingface.co/knowledgator',
    use: 'Answers any other question you put to Decide.',
    href: 'https://huggingface.co/knowledgator/gliclass-base-v3.0',
    window: 'Open.Question',
  },
]
