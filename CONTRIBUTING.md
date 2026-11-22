# Contributing

Roast the code, not the people.

## Build and test

```sh
cargo build
cargo test                                  # unit, golden, CLI and grammar tests
cargo fmt --all --check
cargo clippy --all-targets -- -D warnings
```

CI runs the same four on every pull request, plus `cargo check` on Rust 1.85 (the minimum supported version).

You don't need Anchor or the Solana CLI for any of it. To build the examples for real you do: see the README.

## If you change what the compiler outputs

The generated Rust for the examples is committed next to each `.shi`, and a test fails if it's stale. Regenerate it:

```sh
cargo run -- build examples/trenches --emit-only
```

`tests/fixtures/rustc` holds real rustc output for the error mapping. The test moves its line numbers to match today's output by itself. If it says the fixture is out of date, the erroring lines themselves changed: rerun `cargo check` on that `.shi` with Anchor 1.2 and replace the file.

## Add a banned move

1. Add `("name", "the joke")` to `BANNED` in `src/transpile.rs`. The joke is the error message, so make it good.
2. Add the name to the banned-move pattern in `editors/vscode/syntaxes/typeshi.tmLanguage.json`.
3. Add it to the banned moves line in the README.
4. `cargo test`. `banned_moves_refuse_to_compile` tries every entry in `BANNED`, and `grammar_knows_every_banned_move` checks the grammar.

A new keyword or macro goes the same way: the transpiler, a test in `tests/transpile.rs`, the grammar, the README tables.

## The website

The site in [`site/`](site) runs the real compiler in the browser. You need Node 22 or later; you don't need Rust unless you change the compiler.

```sh
cd site
npm ci
npm run dev         # http://localhost:3000
npm run typecheck
npm test            # design tokens, the scale check, contrast in every theme
npm run build
npm run e2e         # Playwright, desktop and phone, axe in both themes
```

Colors, type sizes, space, corners and durations come from the design tokens in [`site/tokens/`](site/tokens) (W3C DTCG format). Change the JSON, run `npm run tokens`, and commit the generated `tokens.css` and `tokens.ts`. If a color the icons use changes, `npm run icons` redraws them (`npm test` says when). `npm test` fails on a hand-set value. [`site/DESIGN.md`](site/DESIGN.md) says why things look the way they do; change it in the same pull request as the look.

If you change the compiler, `npm run wasm` rebuilds the browser's copy (see [`site/README.md`](site/README.md)).

## Pull requests

Small and focused. Say what changed and how you checked it. Commit messages start with gm, wagmi or "it's so over" ([`hooks/commit-msg`](hooks/commit-msg) enforces it if you install it). No em dashes. No exclamation points.

By contributing you agree your work is released under the MIT license.
