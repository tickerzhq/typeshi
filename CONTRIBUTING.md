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

## Pull requests

Small and focused. Say what changed and how you checked it. Commit messages start with gm, wagmi or "it's so over" ([`hooks/commit-msg`](hooks/commit-msg) enforces it if you install it). No em dashes. No exclamation points.

By contributing you agree your work is released under the MIT license.
