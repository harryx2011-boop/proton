# Proton Web

The website for Proton, served at https://proton-labs.vercel.app. Next.js 16 (App Router), Tailwind 4 and Motion.

## Run

```
npm install
npm run dev          # http://127.0.0.1:5800
npm test             # unit tests (vitest)
npm run typecheck
npm run check:numbers
npm run build
```

Run `node scripts/e2e.mjs http://127.0.0.1:5800 ./e2e-out` against a running site for the width, accessibility and screenshot check.

## Where Things Live

| What | Where |
| --- | --- |
| Facts that change (version, release state, download link, repo link) | `site.config.ts` |
| Measured numbers, each with the line in `context.md` that backs it | `lib/numbers.ts` |
| Demo examples, docs tools, FAQ, charts | `lib/demo/examples.ts`, `lib/docs/tools.ts`, `lib/faq.ts`, `lib/bench/charts.ts` |
| Recorded replies from a real Proton server | `fixtures/demo.json` (written by `npm run record:demo`, never by hand) |
| Design tokens | `app/globals.css`, described in `TOKENS.md` and `DESIGN-SYSTEM.md` |

Adding a demo example, a tool or a chart is one entry in its registry.

## Release Switch

The download button reads `release` in `site.config.ts`. It shows a coming-soon state until `state` is `available` and `downloadUrl` is an https link to the release file.

## Recording The Demo

`npm run record:demo` calls the local Proton server on port 9400 five times per example and stores the median time and the reply. Start Proton first.
