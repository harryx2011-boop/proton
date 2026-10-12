# Tokens: Proton Web

Source of truth: `app/globals.css`. Themes: single, light blue field with black ink.

## Color
| token | value | use | source |
| --- | --- | --- | --- |
| `--color-ink` | `#111111` | text, borders, title bars, filled bars | `app/globals.css:5` |
| `--color-ink-soft` | `#1a2240` | laptop mock hardware | `app/globals.css:6` |
| `--color-field` | `#8fb0ff` | page field behind windows | `app/globals.css:7` |
| `--color-field-deep` | `#6c93ff` | top of the sky, cloud shading | `app/globals.css:8` |
| `--color-field-pale` | `#dce7ff` | lower part of the sky | `app/globals.css:9` |
| `--color-paper` | `#ffffff` | window bodies, tiles, text on ink | `app/globals.css:10` |
| `--color-well` | `#e6e6e6` | grey wells inside windows | `app/globals.css:11` |

## Type
| token | value | use | source |
| --- | --- | --- | --- |
| `--font-sans` | `var(--font-inter-tight), ui-sans-serif, system-ui, sans-serif` | headlines and body (Inter Tight, loaded by next/font) | `app/globals.css:13` |
| `--font-pixel` | `var(--font-vt323), ui-monospace, 'Cascadia Mono', monospace` | window title bars, big numerals | `app/globals.css:14` |
| `--font-mono` | `var(--font-jetbrains), ui-monospace, 'Cascadia Mono', monospace` | code and raw replies | `app/globals.css:15` |
| `--text-caption` | `0.875rem` | captions, table text, small controls | `app/globals.css:18` |
| `--text-body` | `1.0625rem` | body copy | `app/globals.css:20` |
| `--text-lead` | `1.375rem` | intro paragraphs | `app/globals.css:22` |
| `--text-title` | `2rem` | big links, card headings | `app/globals.css:24` |
| `--text-heading` | `clamp(2.5rem, 6.4vw, 5.25rem)` | section and page headings | `app/globals.css:26` |
| `--text-display` | `clamp(3.25rem, 10.4vw, 9.375rem)` | hero headline, 0.8 line height | `app/globals.css:28` |
| `--text-pixel` | `1.375rem` | window title text | `app/globals.css:30` |
| `--text-pixel-lg` | `2.25rem` | pixel sub-headings and stat units | `app/globals.css:32` |
| `--text-pixel-xl` | `clamp(3rem, 6vw, 4.75rem)` | pixel stat numbers | `app/globals.css:34` |
| `--tracking-display` | `-0.045em` | hero headline | `app/globals.css:37` |
| `--tracking-heading` | `-0.035em` | section headings | `app/globals.css:38` |

## Spacing
| token | value | use | source |
| --- | --- | --- | --- |
| `--container-page` | `77.5rem` | page content width | `app/globals.css:51` |
| `--container-prose` | `42rem` | reading column width | `app/globals.css:52` |
| `--header-height` | `2.75rem` | header tiles, scroll offset | `app/globals.css:61` |
| `--dot-step` | `6px` | spacing of the dotted desktop grid | `app/globals.css:62` |

## Radius
| token | value | use | source |
| --- | --- | --- | --- |
| `--radius-dot` | `9999px` | dots only; windows and controls stay square | `app/globals.css:41` |

## Shadow
| token | value | use | source |
| --- | --- | --- | --- |
| `--shadow-window` | `2px 2px 0 0 var(--color-ink)` | hard 1-bit window shadow | `app/globals.css:44` |
| `--shadow-window-lift` | `4px 4px 0 0 var(--color-ink)` | a window while it is dragged | `app/globals.css:45` |

## Motion
| token | value | use | source |
| --- | --- | --- | --- |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | line draws in the privacy diagram | `app/globals.css:47` |
| `--ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)` | entrances, bar growth | `app/globals.css:48` |
| `--ease-snap` | `steps(2, end)` | 1-bit hover flip | `app/globals.css:49` |
| `--duration-control` | `120ms` | hover flip | `app/globals.css:56` |
| `--duration-state` | `420ms` | state changes, bar growth, window pop-in | `app/globals.css:57` |
| `--duration-hero` | `800ms` | hero word rise and lift-in | `app/globals.css:58` |
| `--stagger` | `60ms` | delay between sibling bars and windows | `app/globals.css:59` |
| `--word-stagger` | `70ms` | delay between headline words | `app/globals.css:60` |
