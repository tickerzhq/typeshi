# typeshi.dev: design

The source of truth for how the site looks and why. Change it in the same pull request as the look.
For the brand (no logo, the compiler's own output, the voice) see [`brand/README.md`](../brand/README.md).

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
   lime light (Linear puts its real product there). Nothing under it: the playground speaks for itself.
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

## Copy

Every line earns its place. No all caps anywhere (no `text-transform: uppercase`, no shouted labels);
headings are lowercase, prose is sentence case. Cut any sentence that repeats a heading, a label, a
count already on screen, or another line on the page, and any reassurance that only describes the
site ("nothing retyped", "straight from the README"). Counts, real compiler output, links and the
install command stay. `tests/brand.spec.ts` fails if a page renders all-caps text outside code.

## Layout

Nothing scrolls sideways, at any width from 320 px up and with large system text (125% and 150%) on
phones. Things that can't fit give way in order: words wrap (the hero included), the header drops
its long labels, then GitHub (it's in the footer), then the name beside the `fn` tile. The header's
breakpoints are in em, so they move with the reader's text size. `tests/layout.spec.ts` checks every
page at 13 width and text-size pairs and names what sticks out if anything does.

## The mark

typeshi has no logo on purpose (`brand/README.md`). Every site in the research leads with a mark the
eye can find, so the header sets the favicon's `fn` (lime, the color that means wagmi) as a small tile
before the mono name. Nothing new is drawn: it is the icon `scripts/tokens.mjs` already makes, at
header size. It is one commit and one class (`.tile` in `site.module.css`); drop both to go back to
the name alone.

### Icons

Every icon is that same tile, drawn once in `scripts/mark.mjs` with `fn` as Geist Mono Bold outlines, so it
looks the same whether or not the font is installed (the old favicon used `<text>`, which each OS set in its
own monospace). `scripts/tokens.mjs` writes it as `src/app/icon.svg`; `npm run icons` rasterizes the rest
from the tokens' colors and commits them:

| file | for |
|---|---|
| `src/app/icon.svg` | modern browsers' tab icon |
| `src/app/favicon.ico` | 16, 32 and 48, for old browsers, Windows and bookmarks |
| `src/app/apple-icon.png` | 180, iOS home screens (full bleed: iOS rounds it) |
| `public/icons/icon-192.png`, `icon-512.png` | the web app manifest (`app/manifest.ts`), full bleed |
| `public/icons/maskable-512.png` | Android, which may crop to a circle, so `fn` stays in the middle 80% |
| `editors/vscode/icon.png` | the VS Code extension |

## Share cards

Every page has its own 1200x630 card (`opengraph-image.tsx` next to the page; X uses the same image). They
share one frame (`src/lib/og.tsx`): the tile and the name, the page's own content, and the address it lives
at. They use the dark theme's colors from the tokens and Geist Mono (Satori, which draws them, can't read
the site's WOFF2 files, so it reads the `geist` package's TTFs). Each lesson's card shows its place in the
tour. A shared program's card (`/p/<code>`) runs the compiler on the server and shows the lines around the
first error and what the compiler said, or `compiles. wagmi.`

## Analytics

Vercel Web Analytics and Speed Insights, on Vercel only (no cookies, nothing to consent to). Events:
`build` (with `ok`), `share`, `example`, `lesson_passed` (with the lesson), `solution_shown`,
`tour_finished`. Turn both on in the Vercel project, or `vercel project web-analytics enable typeshi`.

## Pages

| path | what it is |
|---|---|
| `/` | the home, above |
| `/play` | the playground, full screen |
| `/p/<code>` | a shared program: the playground opened on it, with a link preview of the code and the compiler's verdict. Share makes these; old `/play#code=` links still open |
| `/tour`, `/tour/<lesson>` | the tour index and its 25 lessons |
| `/opinions` | banned moves (each with a try-it link), three real error transcripts, the escalation, codes 0x1 to 0x6, the confessions |
| `/keywords` | the keyword table with search, and how the compiler works |
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

Two roles. **Geist Sans** is the reading and display face: headings at 700 (`--weight-heavy`) with tight
tracking (-0.02 to -0.06 em, tighter as they grow), body, navigation, buttons and labels. **Geist Mono** is
for code: code samples, the terminal, the editor, the `typeshi` wordmark, `--gigamaxx`, file names. Before
Nov 22 2026 mono did every job and the site read as a terminal printout; Vercel's Geist, Bun, Deno and
Biome all keep mono for what you type.

A fluid scale in the manner of [Utopia](https://utopia.fyi/blog/designing-with-fluid-type-scales/): each
step has a size at 320 px and at 1240 px, and `clamp()` moves between them. Nine steps, named for
their job:

| step | 320 to 1240 px | for |
|---|---|---|
| `--step-label` | 11.5 to 12 | versions, counts, column heads |
| `--step-code` | 12.5 to 13.5 | code, the terminal, the monospace interface |
| `--step-small` | 14 to 15 | notes, tables, the footer |
| `--step-body` | 16 | body text and inputs (16 px, so phones never zoom into a field) |
| `--step-lede` | 17 to 19 | the lede, the name in the header |
| `--step-subhead` | 20 to 24 | the proofs and doors on the home, sections on a page |
| `--step-title` | 30 to 46 | section headings, the statement, lesson titles |
| `--step-heading` | 38 to 64 | page headings, the doors' counts |
| `--step-display` | 60 to 132 | lock in fn., one line from 320 px up |

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
- `npm run e2e`: the real compiler in the browser, axe in both themes on every page (the 404 included),
  320 px, 44 px targets on a phone, the tabs, the light theme before the first paint, the 404 in the
  site's colors whatever the system says, the home's proofs matching the compiler, the home's height,
  `llms.txt` and the tokens.

## Changes

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
