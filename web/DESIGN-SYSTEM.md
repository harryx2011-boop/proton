# Design System: Proton Web

Values live in `TOKENS.md`. Source: `app/globals.css`.

## Principles
- Show the product before making claims: the home page opens on a working sample, not a feature list.
- Every number on screen comes from `lib/numbers.ts` and traces to a measured line in `context.md`.
- Dark, near-black ground. One accent colour, used only for active state, focus, the install action and chart emphasis.
- Plain words on marketing pages. Technical names appear only in the docs.
- Motion explains a state change or it is cut. Reduced motion shows the settled state.

## Type Scale
Two families, `--font-sans` and `--font-mono`. Six sizes: caption, body, lead, title, heading, display. Headings weigh 650, body 400, captions 500 when they act as labels. No size outside this set.

## Layout
- Page content is centred at `--container-page` with 16 px side gutters on a phone and 24 px from the medium breakpoint up.
- Sections are separated by 64 px (phone) and 80 px (medium up) of vertical space.
- The docs page uses a 14 rem sticky side menu from the large breakpoint; below it the menu is a disclosure.
- Header height is `--header-height`. Footer closes every page.

## Components
| component | file | notes |
| --- | --- | --- |
| Header | `components/Header.tsx` | Sticky, disclosure menu on phones |
| Footer | `components/Footer.tsx` | Links and version; source link only when the repo is public |
| Section | `components/Section.tsx` | Heading, intro, reveal |
| Demo | `components/demo/Demo.tsx` | Typed request, decision rows, raw reply, pause and replay |
| HowItWorks | `components/HowItWorks.tsx` | Three panels with one travelling dot |
| KeyNumbers | `components/KeyNumbers.tsx` | Three measured figures with their date |
| ToolGrid | `components/ToolGrid.tsx` | Six links to the docs |
| Credits | `components/Credits.tsx` | Three model credits |
| BarChart | `components/charts/BarChart.tsx` | Labelled bars, optional threshold tick, table view |
| InstallScene | `components/InstallScene.tsx` | Install, sidebar status, first decision; plays once |
| CopyBlock | `components/CopyBlock.tsx` | Code with a copy button |
| DownloadButton | `components/DownloadButton.tsx` | Coming-soon or link, from `site.config.ts` |

## States
- Hover: a tonal fill change or a lift of `--lift`. No glow.
- Focus: a 2 px accent outline with a 3 px offset on every focusable element.
- Active selection: accent text on a raised fill (demo example buttons, current page link).
- Disabled and loading: the download button shows a status text instead of a dead link.
- Empty and error: the demo renders from recorded data, so it has neither; the install scene shows its end state without JavaScript.

## Motion
- 180 ms for control feedback, 520 ms for state changes, one handoff at a time.
- `--ease-standard` for colour and border changes, `--ease-settle` for fills and reveals.
- Reduced motion: the global rule in `app/globals.css` removes transitions, and the demo and install scene render their finished state.

## Brand
- Mark: the Lucide atom, drawn in `components/Mark.tsx`; favicon `app/icon.png`, copied from the Proton extension's own icon.
- Share card: `app/opengraph-image.tsx`, the mark and the name on the ground colour.
- Voice: calm, precise and plain; no first person and no slang. Headings, navigation, buttons and labels use Title Case; body text uses sentence case.

## Do / Don't
- Do take every colour, size, radius and easing from `TOKENS.md`.
- Do give each chart bar a direct label and a value, and a table view.
- Don't place text above a heading, or add chip rows that restate a section.
- Don't use jargon on marketing pages: no model formats, no number formats.
- Don't show a number that is not in `lib/numbers.ts`.
