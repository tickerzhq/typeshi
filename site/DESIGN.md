# typeshi.tickerz.com: design

The source of truth for how the site looks and why. Change it in the same pull request as the look.
For the brand (the `fn` mark, the compiler's own output, the voice) see [`brand/README.md`](../brand/README.md).

## The idea

The compiler is the hero, and typeshi is a Tickerz project, so the page around it wears Tickerz's live
system: Petrol (the teal-black ground, its text tones and lines, one teal accent, its down red), Geist
for words and Geist Mono for what you would type or what the compiler prints, headlines light (weight
400 at -0.03em), pill buttons, 12 px cards, a solid bar with a hairline, and no glows, gradients or
blur. The values are read from tickerz.com's own tokens (`palette.petrol` and `palette.paper` in
`tokens/tokens.json` say which variable each came from), not redrawn. What stays typeshi's is the
register: the slang, the `fn` mark, and the compiler's colors, each with a job: teal means it worked
(wagmi) and is the one action, red means it didn't (ngmi), amber is a warning. Every number, error and
code sample on the site comes from the real compiler or the repo (`scripts/sync.mjs`), never typed.

## The home

Short on purpose, in the order the best language sites use, on tickerz.com's structure (see "Structure" below).

1. **Hero, split.** On the 12 columns from 1100px: the claim on columns 1 to 6, the proof on 7 to 12
   (typescriptlang.org's editor beside its claim, bun.sh's benchmark beside its own). `lock in fn.` in Geist at
   weight 400 and -0.03em, `fn` set as code in the brand teal. One line under it: what it is and the number
   (about $469M, added up by `sync.mjs` from `docs/exploits`). The install command with a copy button in the hero
   (bun.sh), then two pills: the tour and the playground. Stacked full width under 600px.
2. **The proof card** (`HeroProof`): one terminal card with tabs along the top (typescriptlang.org's "Editor
   Checks, Auto-complete, Interfaces, JSX"): the biggest exploit refused, the units exploit refused, gm_counter's
   lines beside the Rust they become, and the escalation. Every line is the compiler's output at build time.
3. **Why typeshi.** Four reasons, one line each, with an icon tile (rust-lang.org's "Why Rust?", typescriptlang.org's
   three columns): exploits don't compile, money has units, plain Anchor out, it has opinions.
4. **Playground**, then **Exploits** (cards), **The checks** and **Tour** (hairline rows), each section's heading a
   link to its page. No closing section: the install is already in the hero.

The home is held to about 500 words of prose (rust-lang.org 516, ziglang.org 430, gleam.run 575, measured live Nov
24 2026); the playground's code is the rest.

## Structure

The site mirrors tickerz.com's information system, measured live at 390 and 1440 (Nov 24 2026):

- **Frame and grid.** A 1440px frame, 48px gutter (16px at 900 and under), 4 columns on a phone, 8 from 600px,
  12 from 1100px, 16px apart. Layout changes only at 600, 900 and 1100 (`globals.css`).
- **Bar.** The mark, the five pages as plain words (the current one with a 1px line under it), GitHub and the
  theme. At 900 and under the words go into a full-screen menu: each page with a 44px icon tile and one line,
  the rest in two columns, two pills at the bottom (`SiteHeader`). Pages and their lines live in `src/lib/pages.ts`,
  which the bar, the menu, the footer and the side list all read.
- **Sections** (`.sec`, `SecHead`): a hairline, then a 32px heading that links to its page with an arrow, and
  one line under it.
- **Cards** (`.cards`, `.card`): 12px corners, the strong line, the panel ground; four across from 1100px, two
  from 600px, and one sideways row that snaps on a phone, each card 78% wide so the next one shows.
- **Rows** (`.rows`, `.row`): hairlines between, a name and one line, a circled arrow at the end.
- **Reading pages** (`ReadingFrame`): from 1100px the site's groups on columns 1 to 3, the page on 4 to 9,
  "On this page" on 10 to 12, both sides held in view. Below 1100px the page alone.
- **Footer**: a hairline, the groups under 12px mono labels (four across, two on a phone), the legal line.
- **Icons**: Lucide outlines (ISC), 24 grid, 1.75 stroke, in the text's color or the brand teal on a tile.

Before Nov 22 2026 the home also held every banned move, three error transcripts, the escalation, the
error codes, the confessions, the keyword table and how it works: 5,879 px at 1440 and 8,412 px on a
phone. Those now live on `/opinions` and `/keywords`; the home is about 3,300 and 4,400 px, and
`tests/site.spec.ts` holds it under 3,800 and 5,200. The research behind this, with screenshots of
bun.sh, gleam.run, ziglang.org, deno.com, roc-lang.org, astro.build, svelte.dev, biomejs.dev,
tailwindcss.com, Geist and linear.app, is in the pull request that made the change.

## The mark

The mark is the header's `fn` tile: `fn` in Geist Mono Bold, dark (`text-on-accent`) on a brand-teal tile
(`accent-fill`) with corners a sixth of its side, before the mono name (`.tile` in `SiteHeader.module.css`).
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
| `src/app/icon.svg` | any | the tab. Linear's filled tile: it holds on a dark or a light tab bar. With a light scheme it gets a hairline in the light theme's dark teal, because teal on white has about 1.5:1 of edge |
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
output in a terminal on the ground. Each route has an `opengraph-image.tsx`; the 25 lessons
share one with `generateStaticParams`, so every card is a static file.

| card | the terminal shows |
|---|---|
| `/` | `typeshi check` refusing `rug!(pool)`, the whole rustc-style error, ngmi |
| `/play`, `/keywords` | lines of `gm_counter` beside the Rust the compiler writes for them (the phrasebook and `keywordPairs`, both checked by `sync.mjs`) |
| `/tour` | the five chapters and their lesson counts |
| `/exploits` | `typeshi check` refusing the biggest exploit, with its name and loss in the caption |
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
| `/p/<code>` | a shared program: the playground opened on it. Share makes these (the program is in the path, compressed), so the server can run the compiler and the link preview shows the program's first error as the CLI prints it, or its first lines and wagmi. Rendered per request, the card cached at the edge, kept out of search. Old `/play#code=` links still open |
| `/tour`, `/tour/<lesson>` | the tour index and its 25 lessons |
| `/exploits` | the exploit benchmark: every file in `docs/exploits`, biggest loss first. A hairline ledger (name, loss in red, year, check), then one case per exploit: the facts and the source beside the error the compiler prints for it, and a try-it link. `sync.mjs` fails the build if the wasm accepts one or refuses it with another check. It ends on what no compiler stops (stolen keys, prices) |
| `/opinions` | banned moves (each with a try-it link), three real error transcripts, the escalation, codes 0x1 to 0x6, the confessions |
| `/keywords` | the keyword table with search, and how the compiler works |
| `/built` | how it's built: from `.shi` to the screen, the stack with versions read at build, the design system, the checks, the open files |
| any other path | our own 404 (`not-found.tsx`): the site's header, tokens and theme, and every page as a row |

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
  Light is Tickerz's paper ground; accent text turns its dark teal (`palette.paper.brand`), because the
  bright teal fails contrast as text on paper; the bright teal stays as the button fill.
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
step has a size at 320 px and at 1240 px, and `clamp()` moves between them. The three biggest also have
a `fit`, the most of the screen's width they may take (title 11vw, heading 13vw, display 19vw), so with
large system text a word still fits on a phone. It never binds at the default text size. Ten steps, named
for their job:

| step | 320 to 1240 px | for |
|---|---|---|
| `--step-label` | 11.5 to 12 | versions, counts, column heads |
| `--step-code` | 12.5 to 13.5 | code, the terminal, the monospace interface |
| `--step-small` | 14 to 15 | notes, tables, the footer |
| `--step-body` | 16 | body text |
| `--step-input` | 16 | every field you type in or pick from on a touch screen, and the keyword search everywhere |
| `--step-lede` | 17 to 19 | the lede, the name in the header |
| `--step-subhead` | 20 to 24 | sections on a page |
| `--step-title` | 30 to 46 | section headings, the statement, lesson titles |
| `--step-heading` | 38 to 64 | page headings |
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
the version, then the word ground and the GitHub label, then the GitHub icon, which is in the footer
too, then the name beside the `fn` tile) so it fits at 320 px. Its breakpoints are in em, so they move
with the reader's text size. Long words wrap: the body sets `overflow-wrap: break-word`, so a word longer
than its line (a lesson name like `golden_parachute`, a move like `deploy_on_friday!`) breaks where it
must and nowhere else, and a one-column grid is `minmax(0, 1fr)`, never `auto`, so its longest word can't
widen it. Buttons, the lesson tabs and a chapter's progress meter wrap to a second line before they leave
the screen. On a touch screen its targets are 44 px, so below 400 px its gaps close up: with them, the row
was 17 px too wide at 320 px and a phone widened the page by 1 px to hold it. Nothing scrolls sideways
from 320 px up (`tests/system.spec.ts`), on every page and every lesson with 125%, 150% and 200% system
text (`tests/layout.spec.ts`, which names what sticks out, text included), and on a touch screen at 320, 375, 390 and 430 px no page does, on any route or
lesson, before or after you type, build, switch tabs or pick an example (`tests/phone.spec.ts`). That
test also fails when the phone grows its layout viewport to hold a page, which a plain `scrollWidth`
check misses.

## Copy

Every line earns its place. No all caps anywhere; headings are lowercase, prose is sentence case. Cut any
sentence that repeats a heading, a label, a count already on screen, or another line on the page, and any
reassurance that only describes the site. Counts, real compiler output, links and the install command
stay. `tests/share.spec.ts` fails if a page renders all-caps text outside code.

## Analytics

Vercel Web Analytics and Speed Insights, on Vercel only (no cookies, nothing to consent to). Events:
`build` (with `ok`), `share`, `example`, `lesson_passed` (with the lesson), `solution_shown`,
`tour_finished`. Both have to be turned on in the Vercel project.

## Color with a job

| color | token | means | where |
|---|---|---|---|
| teal (Tickerz's brand) | `accent-*` | wagmi: it worked, and go | the one button per page, `fn` in the headline, passes, the slang in the editor, the tour's door |
| red (Tickerz's down) | `state-error` | ngmi: it didn't | errors, banned moves, `rug!()` in the lede, the opinions door |
| amber | `state-warning` | a warning | warnings, the first strike of the escalation |
| amber to red | `color-mix` of the two | it's getting worse | the escalation on the home, one step per failure |
| plain text | `syntax-keyword` | a Rust keyword | keywords stay plain so the slang carries the color. No violet: Tickerz has no purple (Nov 6 2026) |

Nothing is colored for decoration. A new color needs a job first.

## Components and states

- `PageHead` (the top of `/tour`, `/opinions`, `/keywords` and the 404), `SecHead`, `HeroProof`, `Icon`, `SiteHeader`, `ReadingFrame`, `Footer` (every reading page; not the playground or a lesson,
  which fill the screen) and the global `.button` (the brand-teal pill, the primary action, and `data-quiet` for a second
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

- **Nov 23 2026, large text**: with 200% system text (Android's largest) on a 320 px phone, 30 pages
  scrolled sideways, and three lessons did at 150%: one-word names like `golden_parachute` didn't fit
  their column, buttons didn't wrap, and the lesson tabs, the playground's buttons and a chapter's meter
  stayed on one row. The layout test checked one lesson and stopped at 150%, so it never saw them. It now
  checks every page and lesson up to 200%, 34 pages at 15 sizes. Making it fit wasn't enough: words broke
  mid-word (`breaki` / `ng`), so the display, heading and title steps gained a `fit`, the most of the
  screen's width they may take (19, 13 and 11vw). It never binds at the default text size on any phone.
  Names break after an underscore (`golden_` / `parachute`, `src/lib/wbr.tsx`), the home's doors stack
  their number above the name, and the skip link hides by its own height, since its edge showed over the
  header. The site's home is https://typeshi.tickerz.com.
- **Nov 24 2026, tickerz.com's structure**: the site now follows tickerz.com's grid, bar, phone menu, sections,
  cards, rows, docs frame and footer (see "Structure"), and the home takes the best language sites' order: a split
  hero with the install and a tabbed proof card, four reasons with icons, then sections that lead to their pages.
  The doors and the closing section are gone. Fixed: on a phone the home's tour button and the menu's actions
  wrapped to two lines, and the header pushed the page sideways at 320px with 200% text.
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
- **Nov 24 2026, the Tickerz look**: typeshi lives at typeshi.tickerz.com and is a Tickerz project, so it
  wears the parent's live system instead of its own. The source was tickerz.com as served (measured in
  a browser: Petrol ground, Geist with 400-weight headlines, teal pill primary, outline pill secondary,
  12 px cards, a plain bar), not Tickerz's DESIGN.md, which still described square corners. Lime and
  violet left the palette (lime is a color other brands own; Tickerz has no purple); the stage light,
  the card's glow and the bar's blur went; buttons, the select and the theme toggle are pills; the
  primary button's APCA floor is Lc 60, the job's floor for a 16 px label, which Tickerz's own button
  (Lc 69.5) clears.
