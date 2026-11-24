# typeshi.tickerz.com

The typeshi website: a short landing page, a 25-lesson tour, a playground, a page each for the compiler's opinions and the keywords, and how it's built. All of it runs the real compiler in your browser. Live at https://typeshi.tickerz.com.

```sh
npm ci
npm run dev          # writes the tokens, syncs content from the repo, then next dev
npm run typecheck
npm test             # design tokens, the scale check, contrast in every theme
npm run build
PW_CHROMIUM=/path/to/chrome npm run e2e   # or drop PW_CHROMIUM after `npx playwright install chromium`
```

How it looks and why: [`DESIGN.md`](DESIGN.md). Every color, type step, space step, corner and duration is a design token in [`tokens/`](tokens) (W3C DTCG 2025.10). `npm run tokens` writes `src/app/tokens.css` and `src/lib/tokens.ts` from them, and `npm run icons` draws every icon (the `fn` tile) from the same colors; `npm test` fails if any of those drift or if a stylesheet sets a value by hand. Every page's share card is drawn at build from `src/lib/card.tsx` with real compiler output, and `/built` says how all of it is made. The tokens are public at `/tokens/typeshi.resolver.json`, and the language is on one page for AI agents at `/llms.txt`.

## How it stays honest

- **The compiler is the compiler.** `wasm/` wraps `typeshi::transpile` for `wasm32-unknown-unknown`. `npm run wasm` rebuilds it (needs `rustup target add wasm32-unknown-unknown` and `cargo install wasm-bindgen-cli` at the version in `wasm/Cargo.lock`). The output, `public/typeshi.wasm` and `src/wasm/`, is committed so Vercel never needs Rust.
- **Nothing is retyped.** `scripts/sync.mjs` runs before every build and writes `src/generated/content.json` from the repo: the examples, `BANNED`, `FIXED_ERRORS`, the escalation and fud lines, the README's keyword table, and the editor's keyword lists from the VS Code grammar. It runs every example through the wasm and fails the build if the result differs from the committed `lib.rs`, or if the grammar and the compiler disagree on the banned moves. The home's phrasebook (lines of `gm_counter` beside the Rust they become) is checked the same way: each pair must be a whole line of the program and a whole line of what the compiler writes for it.
- **The tour is test data.** Each lesson is a folder in `tour/`: `lesson.md` (a few `key: value` lines, `---`, then the text), `start.shi` and `solution.shi`. The header names a `chapter` and `title`, then what passes: `check: ok` plus any `rust: <text>` the generated Rust must contain, `check: error` plus `error: <text>` an error must say, or `check: warning` plus `warning: <text>` a warning must say. The build runs both files through the compiler and fails if a lesson starts out already passing or its solution doesn't pass. To add a lesson, add a folder; the number in its name sets the order.
- **CI runs it all.** The `site` job in `.github/workflows/ci.yml` runs the wasm bridge's tests, the type check, the token and contrast tests, the build, and the Playwright suite (desktop and phone, axe in both themes, 320 px, 44 px touch targets, no field under 16 px on a touch screen, and no sideways scroll at 320 to 430 px before or after you use a page).

If you change the compiler: `npm run wasm`, then commit `public/typeshi.wasm`, `src/wasm/` and `src/generated/`.

The README's playground picture (`brand/playground-*.png`) is the real site: `BASE_URL=http://localhost:3100 node scripts/readme-shot.mjs` against a running build retakes it.

## Deploy

Vercel, root directory `site`. Static pages, no server code. The wasm is served with long edge caching (see `next.config.ts`).
