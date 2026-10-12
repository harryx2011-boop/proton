# Tokens: Proton Web

Source of truth: `app/globals.css`. Themes: single, dark.

## Color
| token | value | use | source |
| --- | --- | --- | --- |
| `--color-ground` | `#0a0b0e` | page ground | `app/globals.css:5` |
| `--color-surface` | `#111318` | panels and cards | `app/globals.css:6` |
| `--color-raised` | `#181b22` | hover fill, bar tracks, inner wells | `app/globals.css:7` |
| `--color-line` | `#252a34` | hairline borders | `app/globals.css:8` |
| `--color-line-strong` | `#5a6478` | control borders, baseline chart bars | `app/globals.css:9` |
| `--color-fg` | `#eef0f4` | primary text | `app/globals.css:10` |
| `--color-fg-muted` | `#9aa3b2` | secondary text | `app/globals.css:11` |
| `--color-accent` | `#4f86ff` | active state, focus, install button, chart emphasis | `app/globals.css:12` |
| `--color-accent-ink` | `#07090d` | text on accent fills | `app/globals.css:13` |

## Type
| token | value | use | source |
| --- | --- | --- | --- |
| `--font-sans` | `'Inter Variable', ui-sans-serif, system-ui, sans-serif` | all text | `app/globals.css:15` |
| `--font-mono` | `'JetBrains Mono Variable', ui-monospace, 'Cascadia Mono', monospace` | numbers, code, labels in panels | `app/globals.css:16` |
| `--text-caption` | `0.8125rem` | captions, table text, small controls | `app/globals.css:19` |
| `--text-body` | `1rem` | body copy, buttons | `app/globals.css:21` |
| `--text-lead` | `1.1875rem` | intro paragraphs | `app/globals.css:23` |
| `--text-title` | `1.5rem` | card and doc section titles | `app/globals.css:25` |
| `--text-heading` | `2.25rem` | page and section headings | `app/globals.css:27` |
| `--text-display` | `clamp(2.5rem, 7vw, 4.25rem)` | home hero heading | `app/globals.css:29` |

## Spacing
| token | value | use | source |
| --- | --- | --- | --- |
| `--container-page` | `72rem` | page content width | `app/globals.css:40` |
| `--container-prose` | `40rem` | reading column width | `app/globals.css:41` |
| `--header-height` | `4rem` | sticky header, scroll offset | `app/globals.css:49` |

## Radius
| token | value | use | source |
| --- | --- | --- | --- |
| `--radius-control` | `6px` | buttons, inputs, code wells | `app/globals.css:33` |
| `--radius-panel` | `12px` | cards, panels, charts | `app/globals.css:34` |
| `--radius-pill` | `9999px` | bar tracks and fills | `app/globals.css:35` |

## Motion
| token | value | use | source |
| --- | --- | --- | --- |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | hover, color and border changes | `app/globals.css:37` |
| `--ease-settle` | `cubic-bezier(0.16, 1, 0.3, 1)` | bar fills, scroll reveals | `app/globals.css:38` |
| `--duration-control` | `180ms` | control feedback | `app/globals.css:45` |
| `--duration-state` | `520ms` | state changes, bar fills, reveals | `app/globals.css:46` |
| `--stagger` | `60ms` | delay between sibling reveals | `app/globals.css:47` |
| `--lift` | `2px` | hover lift on cards and buttons | `app/globals.css:48` |
