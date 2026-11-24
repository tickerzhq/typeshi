# Changelog

Every release of typeshi. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). Until 1.0, a minor version can change the language.

## [Unreleased]

## [0.1.0] - 2026-11-24

The first release. Binaries for Linux x86_64, macOS (Apple silicon and Intel) and Windows x86_64, with SHA256 checksums, are on the release page.

### The language

- Slang over Rust that compiles to plain Anchor 1.2 Rust for Solana programs. The keyword and macro tables are in the README.
- Banned moves are compile errors: `rug!`, `honeypot!`, `insider_trading!`, `dev_sold!`, `exit_scam!`, `ponzi!` and `deploy_on_friday!`.
- `public` in `#[account(...)]` marks an account anyone may write, on purpose.

### Checks that guard money

- `SHI001`: an instruction that can write an account with an owner, when nothing ties it to a signer, does not compile. The error names the field, the fix and the exploit it prevents (Cashio, $52.8M, 2022).
- `typeshi explain SHI001` prints the check's page: what it catches, the fix, what it has cost and what it does not catch. Every example on the page is a test.

### Commands

- `typeshi new <name>`: a project with a program, a LiteSVM test and `Anchor.toml`.
- `typeshi check [dir]`: typeshi's own checks, no Anchor needed, writes nothing. `--json --locked` for CI.
- `typeshi build [dir]`: every `.shi` to Anchor Rust, then `anchor build`. rustc errors point at the `.shi` line, not the generated Rust.

### Editors

- A VS Code grammar for every keyword, with banned moves marked as errors, and a `$typeshi` problem matcher for the Problems panel.

### The site

- [typeshi.tickerz.com](https://typeshi.tickerz.com) runs the real compiler as WebAssembly: a playground, a 25-lesson tour in five chapters, and shared programs that unfurl with their own card.
- Runs on design tokens with light and dark themes; nothing scrolls sideways on a phone, and no field zooms the page on a touch screen.

### Project

- CI on every pull request: `cargo fmt`, `clippy -D warnings`, tests, MSRV 1.85, and the site's wasm, build and Playwright run.
- A release workflow that builds the four binaries on a `v*` tag matching `Cargo.toml`.
- Dependabot with a 7-day cooldown on version updates; security updates are not delayed.

[Unreleased]: https://github.com/tickerzhq/typeshi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tickerzhq/typeshi/releases/tag/v0.1.0
