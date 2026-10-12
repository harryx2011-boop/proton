# Design System: Proton Web

Values live in `TOKENS.md`. Source: `app/globals.css`.

## Principles
- The page is a small desktop: 1-bit windows with black title bars sit on a blue field. Square corners, one-pixel ink borders, a hard offset shadow.
- Show the product before making claims. The home page opens on a working sample, not a feature list.
- Every number on screen comes from `lib/numbers.ts` and traces to a measured line in `context.md`. A chart whose measurement is missing is not drawn, and the Benchmarks page says what was not measured.
- Plain words on marketing pages. Technical names appear only in the docs.
- Motion explains a state change or it is cut. Animations are CSS keyframes inside `prefers-reduced-motion: no-preference`, so the server HTML, no-JS and reduced-motion users see the finished state.
- Real company marks only, never initials tiles. Icons come from icon-kit.

## Type Scale
Three families: `--font-sans` for headlines and body, `--font-pixel` for window chrome and big numerals, `--font-mono` for code. Sizes: caption, body, lead, title, heading, display, plus pixel, pixel-lg and pixel-xl. Headlines weigh 500, with tight tracking and a 0.8 line height at display size. Headings, navigation, buttons and labels use Title Case; body text uses sentence case.

## Layout
- Content is centred at `--container-page` with 16 px side gutters on a phone and 24 px from the medium breakpoint up.
- The hero is a grainy sky with a halftone atom; the rest of the site sits on the flat field, with dotted desktop panels around demos and charts.
- Large headings carry crop marks. A label never sits above a heading; labels live inside window title bars.
- Windows overlap and can be dragged on wide screens; below the medium breakpoint they stack in a column.

## Components
| component | file | notes |
| --- | --- | --- |
| Header | `components/Header.tsx` | White tiles, dark Download tile, disclosure menu on phones |
| Footer | `components/Footer.tsx` | A window with version, licence and links |
| Section | `components/Section.tsx` | Heading with optional crop marks, intro, content |
| Window | `components/retro/Window.tsx` | 1-bit window with a pixel-font title bar |
| Desktop | `components/retro/Desktop.tsx` | Draggable, stackable windows; arrow keys move a focused window |
| BootLoader | `components/retro/BootLoader.tsx` | Real load progress, only when loading is slow, once per session |
| CropMarks | `components/retro/CropMarks.tsx` | Corner brackets |
| MarginCode | `components/retro/MarginCode.tsx` | Vertical base64 of the real tool names |
| PixelStat | `components/retro/PixelStat.tsx` | Black-box pixel numerals with a caption |
| RuleBlock | `components/retro/RuleBlock.tsx` | Text with a left rule |
| RetroChart | `components/retro/RetroChart.tsx` | Bars, ranges, scatter and before/after charts with a table view |
| Hero | `components/home/Hero.tsx` | Sky, atom art, headline with word rise |
| Demo | `components/demo/Demo.tsx` | Typed request, decision bars, live pixel counter, raw reply |
| ToolsDesktop | `components/home/ToolsDesktop.tsx` | The six tools as draggable windows |
| Compare | `components/home/Compare.tsx` | Chart windows on the home page |
| WorksWith | `components/home/WorksWith.tsx` | Real marks for VS Code, Claude Code, MCP, GitHub, Hugging Face |
| HowItWorks | `components/HowItWorks.tsx` | Three windows joined by dotted lines that draw |
| Privacy | `components/home/Privacy.tsx` | Loopback diagram that stops at the boundary |
| Credits | `components/Credits.tsx` | Three model windows with author marks |
| InstallMock | `components/mock/InstallMock.tsx` | VS Code in a laptop frame, a scripted story that plays once |
| DocsNav | `components/docs/DocsNav.tsx` | Sticky contents with scroll-spy |
| Accordion | `components/faq/Accordion.tsx` | FAQ windows, all answers in server HTML |
| CopyBlock | `components/CopyBlock.tsx` | Code window with a copy button |
| BrandMark | `components/BrandMark.tsx` | Bundled real brand marks from `lib/brands.ts` |

## States
- Hover and selection use the 1-bit flip: ink and paper swap in two steps. The class is `flip`; never name a class `invert`, because Tailwind's `invert` is a filter.
- Focus: a 2 px ink outline with a 2 px offset; white inside title bars.
- Active selection: the flipped state with `aria-pressed`.
- Dragging: the window lifts to the larger shadow and comes to the front.
- Missing data: a chart without its measurement is left out and listed under Not Measured Yet.

## Motion
- Hero: words rise with a 70 ms stagger, then the lead, links and demo lift in.
- Windows pop in once when a desktop scrolls into view; bars grow with a 60 ms stagger.
- One state change at a time. Transform and opacity only, except the drawn dotted lines (scale) and the stroke draw in the privacy diagram.
- Reduced motion, no JavaScript and server HTML show the finished state.

## Brand
- Mark: the two-orbit atom drawn in `components/Mark.tsx`; favicon `app/icon.png`. The halftone atom in `public/art/atom-halftone.svg` is generated by `scripts/make-halftone.mjs`.
- Third-party marks live in `public/brands`, generated by `scripts/make-brands.mjs` from the offline icon kits or fetched from the company's own site, and checked by eye.
- Voice: calm, precise and plain; no first person, no slang.

## Do / Don't
- Do take every colour, size and easing from `TOKENS.md`.
- Do give each chart a table view, a date, a test and the machine it ran on.
- Don't place text above a heading, or add chip rows that restate a section.
- Don't use jargon on marketing pages: no model formats, no number formats.
- Don't show a number that is not in `lib/numbers.ts`, and don't compare with a model we did not run.
- Don't fake progress: the boot loader counts real loads.
