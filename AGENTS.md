# AGENTS.md

typeshi is a joke language that really works: slang over Rust that a source-to-source compiler turns into plain Anchor 1.2 Rust for Solana programs. This repo holds the compiler and CLI (a Rust crate), the website in `site/` that runs the real compiler as WebAssembly, and a VS Code grammar.

## Commands

The crate (Rust 1.85 or later; no Anchor or Solana CLI needed):

```
cargo build
cargo test
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
cargo run -- check examples/trenches            # typeshi's own checks, writes nothing
cargo run -- build examples/trenches --emit-only  # regenerate the committed example .rs
```

The site (Node 22 or later), from `site/`:

```
npm ci
npm run dev         # writes the tokens, syncs content, then next dev on port 3000
npm run typecheck
npm test            # design tokens, the scale check, contrast in every theme
npm run build       # prebuild writes the tokens and runs scripts/sync.mjs
npm run e2e         # Playwright, desktop and phone; serves the last build with next start on port 3100
npm run tokens      # site/tokens/*.json to src/app/tokens.css and src/lib/tokens.ts
npm run icons       # redraw every icon from the tokens
npm run wasm        # rebuild the browser compiler, then sync
```

`npm run e2e` needs `npm run build` first and a Chromium (`npx playwright install chromium`, or point `PW_CHROMIUM` at one). `npm run wasm` needs `rustup target add wasm32-unknown-unknown` and `wasm-bindgen-cli` at the version in `site/wasm/Cargo.lock`.

## What CI checks on a pull request

`.github/workflows/ci.yml`, on every PR to main and every push to main:

- `fmt, clippy, test`: `cargo fmt --all --check`, `cargo clippy --locked --all-targets -- -D warnings`, `cargo test --locked`.
- `msrv (1.85)`: `cargo check --locked --all-targets` on Rust 1.85, so no newer language or library features.
- `anchor (1.2)`: `cargo check --locked --manifest-path examples/trenches/Cargo.toml`, so the Rust typeshi writes for every example compiles against the real Anchor 1.2 crates. A new macro belongs in an example.
- `site (wasm, build, e2e)`: `cargo test --locked --manifest-path site/wasm/Cargo.toml`, then in `site/`: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e`.

Every cargo step uses `--locked`, so commit `Cargo.lock` (and `site/wasm/Cargo.lock`) with any dependency change.

## Release and deploy

- `release.yml` runs on a pushed tag `v*`. The tag must equal `version` in `Cargo.toml` (v0.1.0 today) or the build fails. It builds binaries for Linux x86_64, macOS (Apple silicon and Intel) and Windows x86_64 and publishes a GitHub release with SHA256 checksums. Nothing publishes to crates.io.
- The site deploys on Vercel with root directory `site`: static pages, no server code. Vercel has no Rust toolchain, which is why the wasm build is committed.

## Generated files: regenerate, never hand edit

- `examples/**/src/lib.rs`: written from the `lib.shi` beside it by `cargo run -- build examples/trenches --emit-only`. A test fails when one is stale.
- `site/public/typeshi.wasm` and `site/src/wasm/`: written by `npm run wasm`. When the compiler changes, rebuild and commit them with `site/src/generated/`, or the site keeps running the old compiler.
- `site/src/generated/content.json`: written by `scripts/sync.mjs` before every dev and build. The build fails if the committed wasm no longer produces the committed example `.rs`, or if the editor grammar and the compiler disagree on the banned moves.
- `site/src/app/tokens.css` and `site/src/lib/tokens.ts`: from `site/tokens/*.json` via `npm run tokens`. `npm test` fails on a color, size or space set by hand in a stylesheet.
- `brand/preview.txt` and the brand pictures: drawn from real `typeshi check` output on `tests/fixtures/rug.shi`. If a message changes, `cargo test` fails until you run `cargo build --release && node brand/make.mjs` (needs `npm install` and Playwright's Chromium in `brand/`).

## Gotchas

- A new banned move goes in `BANNED` in `src/transpile.rs`, the banned-move pattern in `editors/vscode/syntaxes/typeshi.tmLanguage.json` and the README. A new keyword or macro goes in the transpiler, `tests/transpile.rs`, the grammar and the README tables. `cargo test` checks the grammar against the compiler.
- `tests/fixtures/rustc` holds real rustc output from Anchor 1.2. If its test says the fixture is out of date, it has to be regenerated with Anchor, not edited.
- Each tour lesson in `site/tour/NN-name/` is test data: the build fails if `start.shi` already passes or `solution.shi` does not.
- `site/DESIGN.md` explains the look; change it in the same PR as the look.
- Commit messages start with `gm`, `wagmi` or `it's so over` (`hooks/commit-msg` enforces it once copied into `.git/hooks/`). No em dashes, no exclamation marks.
- `rustfmt.toml` sets `max_width = 120`.
- Security problems are reported privately as `SECURITY.md` says, never in a public issue.
