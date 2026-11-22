# typeshi.dev: design

The source of truth for how the site looks and why. Change it in the same pull request as the look.
For the brand (the `fn` mark, the compiler's own output, the voice) see [`brand/README.md`](../brand/README.md).

## The idea

The compiler is the hero. The page around it reads like a product: Geist Sans for headings and reading,
Geist Mono only for what you would type or what the compiler prints. The colors are rustc's, and each
one has a job: lime means it worked (wagmi) and is the one action, red means it didn't (ngmi), amber is
a warning, and the editor's violet marks keywords. Every number, error and code sample on the site comes
from the real compiler or the repo (`scripts/sync.mjs`), never typed.

## The home

Short on purpose: five beats of different weight, then the footer. Everything longer has its own page.

1. **Hero.** `lock in fn.` in Geist Sans 700 at the display step, with `fn` set as code in lime (Bun sets
   its one word, *fast*, in its one color). One lede with the punchline, `rug!()` in error red. One button.
2. **The stage.** The real playground, full width, right under the headline, lit from behind by a soft
   lime light (Linear puts its real product there). Three facts under it.
3. **The band.** A raised band (Gleam and Deno use bands for rhythm) with a two-tone statement (Linear's:
   the claim in full ink, the rest quieter) and three proofs (Roc's three, Gleam's claim beside its
   sample). Each proof is a claim, real compiler output and one link out: the `rug!` error (red), lines of
   `gm_counter` beside the Rust the compiler writes for them (lime; `sync.mjs` fails the build if the
   compiler stops writing any of them), and the escalation, colored from amber to red as the failures
   pile up.
4. **dyor.** Four doors in a hairline grid (Tailwind's and Geist's framed cells): tour, playground,
   opinions, keywords, each with its real count in its color.
5. **The close.** "still here? lock in." (Gleam ends on a joke and the one action), the button again,
   and the install command.

Before Nov 22 2026 the home also held every banned move, three error transcripts, the escalation, the
error codes, the confessions, the keyword table and how it works: 5,879 px at 1440 and 8,412 px on a
phone. Those now live on `/opinions` and `/keywords`; the home is about 3,300 and 4,400 px, and
`tests/site.spec.ts` holds it under 3,800 and 5,200. The research behind this, with screenshots of
bun.sh, gleam.run, ziglang.org, deno.com, roc-lang.org, astro.build, svelte.dev, biomejs.dev,
tailwindcss.com, Geist and linear.app, is in the pull request that made the change.

## The mark

The mark is the header's `fn` tile: `fn` in Geist Mono Bold, dark (`text-on-accent`) on a lime tile
(`accent-fill`) with corners a sixth of its side, before the mono name (`.tile` in `site.module.css`).
Every site in the research leads with a mark the eye can find. Since Nov 22 2026 it is also every icon
and the corner of every share card (below), so a tab, a home screen and a link preview all show the
same tile. `brand/README.md` has the rules for using it.

## Icons

One drawing, `scripts/icons.mjs` (`npm run icons`), makes all of them. The letters are Geist Mono's own
outlines, read out of `src/fonts/static/GeistMono-700.woff` by `scripts/glyphs.mjs`, so the icon never
depends on a font the reader has; the colors are the tokens. Research (Vercel, Linear, Bun, Gleam) is in
the pull request that added them.

| file | size | why |
|---|---|---|
| `src/app/icon.svg` | any | the tab. Linear's filled tile: it holds on a dark or a light tab bar. With a light scheme it gets a hairline in the light theme's green, because lime on white has about 1.2:1 of edge |
| `src/app/favicon.ico` | 16, 32, 48 | for crawlers, feed readers and anything that asks for `/favicon.ico` without reading the page |
| `src/app/apple-icon.png` | 180 | iOS reads neither SVG nor the manifest. Full bleed: iOS rounds the corners and paints transparent ones black |
| `public/icons/icon-192.png`, `icon-512.png` | 192, 512 | the manifest (`src/app/manifest.ts`), the tile as the tab shows it |
| `public/icons/icon-maskable-512.png` | 512 | full bleed, `fn` at 46% of the side, inside the middle 80% that Android's circles and squircles keep |

At tab size `fn` spans two thirds of the tile so it reads at 16 px; the app icons give it more room.
Each PNG carries a hash of the drawing it came from (a `tEXt` chunk), and `scripts/icons.test.mjs` fails
when a drawing changes and its pictures weren't redrawn, without failing when a Next.js update renders
the same drawing a pixel differently.

## Share cards

Every page has its own 1200 x 630 card, drawn at build by `next/og` (Satori and resvg) from one template,
`src/lib/card.tsx`, the way Linear and Bun template theirs: the mark and wordmark with the version, the
page's path, where you are (`tour · basics · lesson 2 of 25`), the title in Geist 700, and real compiler
output in a terminal under the home's stage light. Each route has an `opengraph-image.tsx`; the 25 lessons
share one with `generateStaticParams`, so every card is a static file.

| card | the terminal shows |
|---|---|
| `/` | `typeshi check` refusing `rug!(pool)`, the whole rustc-style error, ngmi |
| `/play`, `/keywords` | lines of `gm_counter` beside the Rust the compiler writes for them (the phrasebook and `keywordPairs`, both checked by `sync.mjs`) |
| `/tour` | the five chapters and their lesson counts |
| `/opinions` | `typeshi check` on a Friday deploy |
| `/tour/<lesson>` | the line of `lib.rs` the solution writes that the lesson checks for, or the error or warning it is about (`proof` in `content.json`, from `sync.mjs`) |
| `/built` | `.shi` to `lib.rs` to the wasm, its gzipped size, and the page count |

Satori can't read the site's variable WOFF2, so `src/fonts/static/` holds static WOFF instances (400 and
700) cut from those same files with fontTools. The title steps down with its length (136 px for a short
one, 80 for a long one) so it never takes more than two lines; a long line of Rust shrinks to fit, down to
17 px, and is never cut. `pageMeta()` (`src/lib/meta.ts`) gives every page its own `og:title`,
description, canonical address and `twitter:card` `summary_large_image`; before, every page inherited the
home's.

## Pages

| path | what it is |
|---|---|
| `/` | the home, above |
| `/play` | the playground, full screen |
| `/tour`, `/tour/<lesson>` | the tour index and its 25 lessons |
| `/opinions` | banned moves (each with a try-it link), three real error transcripts, the escalation, codes 0x1 to 0x6, the confessions |
| `/keywords` | the keyword table with search, and how the compiler works |
| `/built` | how it's built: from `.shi` to the screen, the stack with versions read at build, the design system, the checks, the open files |
| any other path | our own 404 (`not-found.tsx`): the site's header, tokens and theme, and the four doors |

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

`npm run tokens` (also run before `dev` and `build`) writes two files from them, both generated, neither
edited by hand:

- `src/app/tokens.css`: the CSS variables. Each semantic color is `light-dark(light, dark)` inside
  `@supports`, with the dark value as the fallback, so a browser without `light-dark()` still gets the dark site.
- `src/lib/tokens.ts`: every variable name as the type `TokenVar`, `v("name")` for a checked `var(--name)`,
  and each theme's colors as sRGB hex for the places CSS can't reach (the share cards, the icons).

The icons come from the same colors through `npm run icons` (above).

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

Two roles. **Geist Sans** is the reading and display face: headings at 700 (`--weight-heavy`) with tight
tracking (-0.02 to -0.06 em, tighter as they grow), body, navigation, buttons and labels. **Geist Mono** is
for code: code samples, the terminal, the editor, the `typeshi` wordmark, `--gigamaxx`, file names. Before
Nov 22 2026 mono did every job and the site read as a terminal printout; Vercel's Geist, Bun, Deno and
Biome all keep mono for what you type.

A fluid scale in the manner of [Utopia](https://utopia.fyi/blog/designing-with-fluid-type-scales/): each
step has a size at 320 px and at 1240 px, and `clamp()` moves between them. Ten steps, named for
their job:

| step | 320 to 1240 px | for |
|---|---|---|
| `--step-label` | 11.5 to 12 | versions, counts, column heads |
| `--step-code` | 12.5 to 13.5 | code, the terminal, the monospace interface |
| `--step-small` | 14 to 15 | notes, tables, the footer |
| `--step-body` | 16 | body text |
| `--step-input` | 16 | every field you type in or pick from on a touch screen, and the keyword search everywhere |
| `--step-lede` | 17 to 19 | the lede, the name in the header |
| `--step-subhead` | 20 to 24 | the proofs and doors on the home, sections on a page |
| `--step-title` | 30 to 46 | section headings, the statement, lesson titles |
| `--step-heading` | 38 to 64 | page headings, the doors' counts |
| `--step-display` | 60 to 132 | lock in fn., one line from 320 px up |

Headings use `text-wrap: balance`; paragraphs and list items use `text-wrap: pretty` (Firefox falls back
to normal wrapping). Numbers that change use `tabular-nums`. Body copy is held to 56 to 72 characters.

**No zoom on a phone.** iOS Safari zooms the page into a text field under 16 px the moment it gets focus,
and a zoomed page scrolls sideways. So on a touch screen (`pointer: coarse`) every field you type in or
pick from is `--step-input`, 16 px: the editor (and the boot text that stands in for it while it loads),
the example picker and the keyword search. With a mouse the editor stays at `--step-code` and the picker
at `--step-small`. The editor's lines wrap at 16 px as they did before, and its scroller holds anything
that can't wrap, so it never widens the page. Why the pointer and not a width: GitHub's Primer sets its
fields to 16 px only under `@supports (-webkit-touch-callout: none)` (iOS) and goes back to 14 px from
768 px up, which leaves an iPhone on its side (844 to 932 px wide) zooming. The pointer covers every phone
and tablet in either orientation, and it is the media query the 44 px targets already use. The viewport
keeps pinch zoom: no `maximum-scale`, no `user-scalable=no`. `--step-input` never drops under 16 px
(`scripts/tokens.test.mjs`).

## Space and layout

Space steps are multiples of 4 px; the larger ones grow from 320 px to 1240 px (`--space-3xs` 4 px up to
`--space-3xl` 72 to 112 px). Three layout primitives in `globals.css`, after Every Layout: `.stack`
(a column with one gap), `.cluster` (a row that wraps) and `.grid` (as many columns as fit, no
breakpoints). The banned-move cards and the how-it-works steps use `subgrid`, so each card's name, joke
and link line up with their neighbours.

Components fit their box, not the viewport: the header and the playground use container queries
(`container: header`, `container: playground`). The header gives way in order (the section links, then
the version, then the word ground and the GitHub label) so it fits at 320 px. On a touch screen its
targets are 44 px, so below 400 px its gaps close up: with them, the row was 17 px too wide at 320 px and
a phone widened the page by 1 px to hold it. Nothing scrolls sideways from 320 px up
(`tests/system.spec.ts`), and on a touch screen at 320, 375, 390 and 430 px no page does, on any route or
lesson, before or after you type, build, switch tabs or pick an example (`tests/phone.spec.ts`). That
test also fails when the phone grows its layout viewport to hold a page, which a plain `scrollWidth` check
misses.

## Color with a job

| color | token | means | where |
|---|---|---|---|
| lime | `accent-*` | wagmi: it worked, and go | the one button per page, `fn` in the headline, passes, the tour's door |
| red | `state-error` | ngmi: it didn't | errors, banned moves, `rug!()` in the lede, the opinions door |
| amber | `state-warning` | a warning | warnings, the first strike of the escalation |
| amber to red | `color-mix` of the two | it's getting worse | the escalation on the home, one step per failure |
| violet | `syntax-keyword` | a keyword | keywords in the editor, the keywords door |

Nothing is colored for decoration. A new color needs a job first.

## Components and states

- `PageHead` (the top of `/tour`, `/opinions`, `/keywords` and the 404), `Doors` (the four ways into the
  site, with counts from `content.json`), `Footer` (every reading page; not the playground or a lesson,
  which fill the screen) and the global `.button` (the lime primary action, and `data-quiet` for a second
  way in).
- One tabs primitive (`src/components/Tabs.tsx`) for the playground and the lesson, after the WAI-ARIA
  tabs pattern: one tab in the tab order, arrow keys and Home and End move, each tab names its panel.
- Native elements first: `select`, `button`, `details` where it's enough.
- Every control has hover, `:focus-visible` (a 2 px accent outline), active (pressed buttons scale to
  0.97) and disabled. The playground is `aria-busy` and its build button is disabled until the compiler
  and the editor are ready.
- On a touch screen (`pointer: coarse`) every control is at least 44 px tall (`--size-target`), and every
  field is at least 16 px (`--step-input`, under Type).
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
  space value by hand, every variable read exists and every semantic color is used, `--step-input` is at
  least 16 px, every text pair passes contrast, and every icon matches its drawing.
- `npm run e2e`: the real compiler in the browser, axe in both themes on every page (the 404 included),
  320 px, 44 px targets on a phone, the tabs, the light theme before the first paint, the 404 in the
  site's colors whatever the system says, the home's proofs matching the compiler, the home's height,
  `llms.txt` and the tokens, the icons and the manifest, a 1200 x 630 card and its own `og:title` on every
  page (all 31), and `/built` from the footer. On a touch screen (`tests/phone.spec.ts`): no field under
  16 px on any page at 320 and 390 px, every lesson included; no page wider than the phone at 320, 375, 390
  and 430 px, on load and after you focus the editor, type a line longer than the screen, build, switch
  every tab, open the picker and load every example, or search the keywords. With a mouse, the editor and
  the picker keep their sizes.

## Changes

- **Nov 22 2026, no zoom on a phone**: the site scrolled sideways on a phone because iOS Safari zoomed in
  when you tapped the editor (12.6 px) or the example picker (14 px). On a touch screen every field is now
  `--step-input`, a new token at 16 px; a mouse keeps the old sizes. Fixed on the way: at 320 px on a touch
  screen the header's 44 px targets made its row 17 px too wide, and the page came out 321 px. New checks
  in `tests/phone.spec.ts` and `scripts/tokens.test.mjs`.
- **Nov 22 2026, icons, cards and /built**: the `fn` tile is the app icon: `favicon.ico`, an `icon.svg`
  that adapts to a light tab bar, a 180 px `apple-icon`, and a manifest with 192, 512 and maskable 512, all
  from `scripts/icons.mjs` and Geist Mono's outlines. Every page, each lesson included, has its own share
  card from `src/lib/card.tsx`, with real compiler output. `/built` says how it's made, linked from the
  footer. Fixed: every page shared the home's `og:title` and `twitter:title`.
- **Nov 22 2026, the redesign**: a short home (hero, the live compiler on a lit stage, a statement and
  three proofs of real output, four doors, a close) instead of the docs on one page; `/opinions` and
  `/keywords` are their own pages, as the nav already said; Geist Sans for headings and reading, mono only
  for code; color with a job (lime, red, amber, violet); `--step-subhead` and `--weight-heavy`;
  `--step-display` starts at 60 px so the headline fills a phone; the footer on every reading page; our
  own 404, in the site's colors. Fixed: Next's built-in 404 set its own body colors from
  `prefers-color-scheme`, so with the system in light and the site in dark it showed a dark header over a
  white page with a black wordmark.
- **Nov 22 2026**: tokens moved into DTCG JSON with a resolver; a light theme from the brand's light
  palette and a more-contrast mode; the fluid type and space scales; container queries, subgrid and the
  layout primitives; one tabs primitive; 44 px touch targets; fonts cut to Latin; the playground paints
  its program before the editor loads; cross-document slides in the tour; `/llms.txt` and `/tokens/`.
  Fixed on the way: the header overflowed at 320 px, and on phones a lesson's terminal and lib.rs panes
  were 0 px tall.
