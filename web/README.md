# Proton Web

The website for Proton, served at https://proton-labs.vercel.app. Next.js 16 (App Router), Tailwind 4 and Motion. The look is a retro desktop: 1-bit windows on a blue field.

## Run

```
npm install
npm run dev          # http://127.0.0.1:5800
npm test             # unit tests (vitest)
npm run typecheck
npm run check:numbers
npm run build
```

Run `node scripts/e2e.mjs http://127.0.0.1:5800 ./e2e-out` against a running production build for the checks that matter: no sideways scroll and no axe violations at 390 and 1440 px, the headline visible with and without JavaScript, no element carrying a CSS invert filter, the hero animation and its reduced-motion end state, and window drag, raise and arrow-key moves. Set `CHROME_PATH` to a Chromium executable if Playwright's own browser is missing.

## Where Things Live

| What | Where |
| --- | --- |
| Facts that change (version, release state, download link, repo link) | `site.config.ts` |
| Measured numbers, each with the line in `context.md` that backs it | `lib/numbers.ts` (51 numbers; `npm run check:numbers` guards them) |
| Demo examples, docs tools, FAQ, credits, charts | `lib/demo/examples.ts`, `lib/docs/tools.ts`, `lib/faq.ts`, `lib/credits.ts`, `lib/bench/charts.ts` |
| Recorded replies from a real Proton server | `fixtures/demo.json` (`npm run record:demo`, never by hand) |
| Benchmarks | `fixtures/bench.json`, `bench-llm.json`, `bench-numbers.json` (written by `scripts/bench-*.mjs`, never by hand) |
| Design tokens and primitives | `app/globals.css`, described in `TOKENS.md` and `DESIGN-SYSTEM.md` |
| Window, desktop, boot loader, charts | `components/retro/` |
| Real company marks | `public/brands/` from `scripts/brands.config.json` (`node scripts/make-brands.mjs`) and the registry `lib/brands.ts` |
| UI icons | `components/icons/generated.tsx` from `scripts/icons.config.json` (`node scripts/make-icons.mjs`) |

The icon and brand scripts read a folder of Iconify kit JSON files (icon-kit's `packages/core/kits`). Point `ICON_KIT_DIR` at it before running them. The generated files are committed, so you only need the kits to add an icon or a brand.
| Hero art | `public/art/atom-halftone.svg` (`node scripts/make-halftone.mjs`) |

Adding a demo example, a tool, a chart, an icon or a brand is one entry in its registry or config.

## Release Switch

The download button reads `release` in `site.config.ts`. It shows a coming-soon state until `state` is `available` and `downloadUrl` is an https link to the release file.

## Measuring

- `npm run record:demo` calls the local Proton server on port 9400 five times per example and stores the median time and the reply. Start Proton first.
- `node scripts/bench-latency.mjs` calls the live server 200 times per tool.
- `node scripts/bench-llm.mjs` compares Proton with a small local model. It runs only if Ollama already answers and never starts Ollama or pulls a model.

## Gotchas

- Tailwind's `invert` utility is `filter: invert(1)`. The 1-bit hover class is `flip`.
- The `flip` hover rules are unlayered CSS on purpose, so they beat the `bg-*` and `text-*` utilities on a tile.
- Content must be in the server HTML: animations are CSS keyframes inside `prefers-reduced-motion: no-preference`.
