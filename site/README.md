# typeshi.dev

The typeshi website: a landing page, a 25-lesson tour, and a playground. All of it runs the real compiler in your browser.

```sh
npm install
npm run dev          # syncs content from the repo, then next dev
npm run build
PW_CHROMIUM=/path/to/chrome npm run e2e   # or drop PW_CHROMIUM after `npx playwright install chromium`
```

## How it stays honest

- **The compiler is the compiler.** `wasm/` wraps `typeshi::transpile` for `wasm32-unknown-unknown`. `npm run wasm` rebuilds it (needs `rustup target add wasm32-unknown-unknown` and `cargo install wasm-bindgen-cli` at the version in `wasm/Cargo.lock`). The output, `public/typeshi.wasm` and `src/wasm/`, is committed so Vercel never needs Rust.
- **Nothing is retyped.** `scripts/sync.mjs` runs before every build and writes `src/generated/content.json` from the repo: the examples, `BANNED`, `FIXED_ERRORS`, the escalation and fud lines, the README's keyword table, and the editor's keyword lists from the VS Code grammar. It runs every example through the wasm and fails the build if the result differs from the committed `lib.rs`, or if the grammar and the compiler disagree on the banned moves.
- **The tour is test data.** Each lesson is a folder in `tour/`: `lesson.md` (a few `key: value` lines, `---`, then the text), `start.shi` and `solution.shi`. The header names a `chapter` and `title`, then what passes: `check: ok` plus any `rust: <text>` the generated Rust must contain, `check: error` plus `error: <text>` an error must say, or `check: warning` plus `warning: <text>` a warning must say. The build runs both files through the compiler and fails if a lesson starts out already passing or its solution doesn't pass. To add a lesson, add a folder; the number in its name sets the order.
- **CI runs it all.** The `site` job in `.github/workflows/ci.yml` runs the wasm bridge's tests, the build, and the Playwright suite (desktop and phone, including axe accessibility checks).

If you change the compiler: `npm run wasm`, then commit `public/typeshi.wasm`, `src/wasm/` and `src/generated/`.

## Deploy

Vercel, root directory `site`. Static pages, no server code. The wasm is served with long edge caching (see `next.config.ts`).
