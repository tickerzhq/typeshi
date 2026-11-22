# typeshi.dev: design

The source of truth for how the site looks and why. Change it in the same pull request as the look.
For the brand (no logo, the compiler's own output, the voice) see [`brand/README.md`](../brand/README.md).

## The idea

The site is a terminal for the trenches. Its look is the compiler's: monospace type, rustc's colors on a
near-black page, one lime accent that means it worked (wagmi) and one red that means it didn't (ngmi).
Every number, error and code sample on it comes from the real compiler (`scripts/sync.mjs`), never typed.

## Tokens

All colors, type steps, space steps, corners, sizes and durations live in [`tokens/`](tokens), in the
W3C Design Tokens format ([DTCG 2025.10](https://www.designtokens.org/TR/2025.10/), the first stable
version):

| file | what it holds |
|---|---|
| `typeshi.resolver.json` | the order the others apply in: the base set, then a `theme` modifier (dark, light), then `contrast` (normal, more) |
| `tokens.json` | primitives (the OKLCH palette), the dark theme's semantic colors, type, space, radius, size, duration, easing |
| `light.json` | the light theme: the same semantic names, other values |
| `contrast-more.json` | what changes when the system asks for more contrast |

`npm run tokens` (also run before `dev` and `build`) writes three files from them, all generated, none
edited by hand:

- `src/app/tokens.css`: the CSS variables. Each semantic color is `light-dark(light, dark)` inside
  `@supports`, with the dark value as the fallback, so a browser without `light-dark()` still gets the dark site.
- `src/lib/tokens.ts`: every variable name as the type `TokenVar`, `v("name")` for a checked `var(--name)`,
  and each theme's colors as sRGB hex for the one place CSS can't reach (the OG image).
- `src/app/icon.svg`: the favicon, in the theme's colors.

The tokens are public at `/tokens/typeshi.resolver.json` (and its three sets), so any tool or agent can
build on the same values.

### Two layers

- **Primitives** (`palette.*`): OKLCH ramps. A step's number is (1 minus lightness) x 1000, so `gray-855`
  is lightness 0.145, a bigger number is darker, and equal steps look equally far apart, because OKLCH
  lightness is perceptual (the reason Linear moved its themes to LCH).
- **Semantic** (`color.*`): what components use. `surface` (page, raised, sunk, terminal), `text`
  (primary, secondary, tertiary, and the colors that sit on fills), `border`, `accent` (text, fill,
  fill-hover, selection), `state` (error, warning), `syntax` (the editor), `overlay` (tints that work on
  any surface). Components never name a primitive.

### Themes

- **Dark is the look and the default.** Like Linear's marketing site, the site is dark by design.
- **Light** is the brand's light palette (the README header's light colors), for reading in daylight. The
  half-filled circle in the header turns it on and the choice is remembered (`localStorage`
  `typeshi:theme`). A script in `<head>` applies it before the first paint, so there is no flash.
  Accent text turns dark green in light, because the lime fails contrast as text on white; the lime
  stays as the button fill.
- **More contrast** follows the system (`prefers-contrast: more`): secondary and tertiary text move to
  near-primary, borders darken, the error red lightens.
- **Display P3**: `red-290` (ngmi) is mapped into sRGB as its token value; screens with P3 get its full
  chroma from the token's extension (`@media (color-gamut: p3)`). Everything else already fits sRGB, so
  nothing else changes on a P3 screen.

### Contrast

`scripts/contrast.test.mjs` checks every text color on every surface it sits on, in all four
resolutions (dark, light, and each with more contrast). WCAG 2.2 AA (4.5:1) is the rule. APCA is the
second look, with a floor per job from [APCA in a Nutshell](https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html):
Lc 75 for primary text, 60 for body copy, 45 for accent, state and syntax colors, 30 for meta text.
The test prints the lowest pair per color. On Nov 22 2026 the dark theme's secondary text moved from
lightness 0.74 to 0.77 to reach Lc 60 for body copy.

## Type

Geist and Geist Mono (SIL OFL 1.1), self-hosted, variable, cut to Latin (`src/fonts/`, 65 KB for both).
Sans has next/font's metric-matched Arial fallback; the mono fallbacks share Geist Mono's 0.6 em advance,
so lines keep their length while the font loads.

A fluid scale in the manner of [Utopia](https://utopia.fyi/blog/designing-with-fluid-type-scales/): each
step has a size at 320 px and at 1240 px, and `clamp()` moves between them. Eight steps, named for
their job:

| step | 320 to 1240 px | for |
|---|---|---|
| `--step-label` | 11.5 to 12 | versions, counts, column heads |
| `--step-code` | 12.5 to 13.5 | code, the terminal, the monospace interface |
| `--step-small` | 14 to 15 | notes, tables, the footer |
| `--step-body` | 16 | body text and inputs (16 px, so phones never zoom into a field) |
| `--step-lede` | 17 to 19 | the lede, the name in the header |
| `--step-title` | 30 to 46 | section headings, lesson titles |
| `--step-heading` | 38 to 64 | page headings |
| `--step-display` | 48 to 132 | lock in fn., one line from 320 px up |

Headings use `text-wrap: balance`; paragraphs and list items use `text-wrap: pretty` (Firefox falls back
to normal wrapping). Numbers that change use `tabular-nums`. Body copy is held to 56 to 72 characters.

## Space and layout

Space steps are multiples of 4 px; the larger ones grow from 320 px to 1240 px (`--space-3xs` 4 px up to
`--space-3xl` 72 to 112 px). Three layout primitives in `globals.css`, after Every Layout: `.stack`
(a column with one gap), `.cluster` (a row that wraps) and `.grid` (as many columns as fit, no
breakpoints). The banned-move cards and the how-it-works steps use `subgrid`, so each card's name, joke
and link line up with their neighbours.

Components fit their box, not the viewport: the header and the playground use container queries
(`container: header`, `container: playground`). The header gives way in order (the section links, then
the version, then the word ground and the GitHub label) so it fits at 320 px. Nothing scrolls sideways
from 320 px up (`tests/system.spec.ts`).

## Components and states

- One tabs primitive (`src/components/Tabs.tsx`) for the playground and the lesson, after the WAI-ARIA
  tabs pattern: one tab in the tab order, arrow keys and Home and End move, each tab names its panel.
- Native elements first: `select`, `button`, `details` where it's enough.
- Every control has hover, `:focus-visible` (a 2 px accent outline), active (pressed buttons scale to
  0.97) and disabled. The playground is `aria-busy` and its build button is disabled until the compiler
  and the editor are ready.
- On a touch screen (`pointer: coarse`) every control is at least 44 px tall (`--size-target`).
- While CodeMirror loads, the editor shows the program as plain text laid out like the editor
  (`BootCode`), so the code is the first thing a phone paints.

## Motion

Durations (`--dur-press` 120 ms, `--dur-hover` 150 ms, `--dur-state` 200 ms, `--dur-page` 400 ms) and
easings (`--ease-out`, `--ease-in-out`) are tokens. Back and next in the tour are cross-document
navigations with `@view-transition { navigation: auto }`: the lesson text slides left going forward and
right going back, 56 to 72 px, and the header stays put. Other page loads skip the transition.
`prefers-reduced-motion` turns every transition and animation off.

## Agents

`/llms.txt` is built from the same `content.json` as the pages: what typeshi is, every keyword and the
Rust it becomes, the banned moves, the fixed error codes, a whole program and the tour. The tokens are at
`/tokens/`. This file is the design source of truth.

## Checks

- `npm test`: the generated token files match `tokens/`, the token files have the DTCG shape, every color
  fits sRGB (and P3 where given), no stylesheet or component sets a color, type size, corner, duration or
  space value by hand, every variable read exists and every semantic color is used, and every text pair
  passes contrast.
- `npm run e2e`: the real compiler in the browser, axe in both themes, 320 px, 44 px targets on a phone,
  the tabs, the light theme before the first paint, `llms.txt` and the tokens.

## Changes

- **Nov 22 2026**: tokens moved into DTCG JSON with a resolver; a light theme from the brand's light
  palette and a more-contrast mode; the fluid type and space scales; container queries, subgrid and the
  layout primitives; one tabs primitive; 44 px touch targets; fonts cut to Latin; the playground paints
  its program before the editor loads; cross-document slides in the tour; `/llms.txt` and `/tokens/`.
  Fixed on the way: the header overflowed at 320 px, and on phones a lesson's terminal and lib.rs panes
  were 0 px tall.
