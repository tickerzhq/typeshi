# Changelog

Every release of typeshi. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). Until 1.0, a minor version can change the language.

## [Unreleased]

## [0.1.0] - 2026-11-24

The first release. Binaries for Linux x86_64, macOS (Apple silicon and Intel) and Windows x86_64, with SHA256 checksums, are on the release page.

### The language

- Slang over Rust that compiles to plain Anchor 1.2 Rust for Solana programs. The keyword and macro tables are in the README.
- Banned moves are compile errors: `rug!`, `honeypot!`, `insider_trading!`, `dev_sold!`, `exit_scam!`, `ponzi!` and `deploy_on_friday!`.
- `public` in `#[account(...)]` marks an account anyone may write, on purpose.
- `ticker USDC = 6;` names a money unit and `ticker SOL_USDC = 8 USDC / SOL;` a price. Both are plain `u64`s in the Rust, with a `_DECIMALS` constant.
- `send_it!(from => to, amount, authority)` is an SPL token transfer whose signer seeds typeshi writes for an account with `seeds`. `#[iou]` on a frame field marks money owed to the program, and `#[printer_go_brrr]` on a fn marks one that mints on purpose.

### Checks that guard money

Seven checks refuse the bug classes that have drained real programs. Each error names the fix and the exploit it prevents, and `typeshi explain SHI00N` prints the check's page: what it catches, the fix, what it has cost and what it does not catch. Every example on those pages is a test.

- `SHI001`: an instruction that can write an account with an owner when nothing ties it to a signer (Cashio, $52.8M, 2022). `public` lets an account through on purpose.
- `SHI002`: money has units. `ticker USDC = 6;` declares one, and adding, comparing or writing two different units is a compile error (Moonwell, $1.78M, 2026).
- `SHI003`: a raw `UncheckedAccount` or `AccountInfo` that no owner, address, seeds or constraint pins down (Wormhole, about $320M, 2022).
- `SHI004`: calling a program the caller picked (Loopscale, about $5.8M, 2025).
- `SHI005`: `init_if_needed`, which lets a second call reset an account (Candy Machine v1, 1,027 SOL, 2022).
- `SHI006`: money is conserved through every branch. A balance that rises by more than comes in, or a payout that lowers no balance, does not compile, and a debt marked `#[iou]` counts the other way, so a loan adds up (Qubit, about $80M, 2022).
- `SHI007`: a conversion that comes out in the wrong unit or off by a power of ten. typeshi follows every `*`, `/` and `10u128.pow(...)` to the unit and decimals a conversion comes out in, and the error names the power of ten that fixes it (Morpho PAXG/USDC, about $230K, 2024, off by 10^12).
- Eight real exploits are kept as examples that must fail to compile, and every example (a vault and a lending market among them) compiles against real Anchor 1.2 in CI.

### Commands

- `typeshi new <name>`: a project with a program, a LiteSVM test and `Anchor.toml`.
- `typeshi check [dir]`: typeshi's own checks, no Anchor needed, writes nothing. `--json --locked` for CI.
- `typeshi build [dir]`: every `.shi` to Anchor Rust, then `anchor build`. rustc errors point at the `.shi` line, not the generated Rust.

### Editors

- A VS Code grammar for every keyword, with banned moves marked as errors, and a `$typeshi` problem matcher for the Problems panel.

### The site

- [typeshi.tickerz.com](https://typeshi.tickerz.com) runs the real compiler as WebAssembly: a playground, a 25-lesson tour in five chapters, and shared programs that unfurl with their own card.
- The compiler's wasm URL carries its hash, so a new deploy never runs the old compiler from cache.
- Runs on design tokens with light and dark themes; nothing scrolls sideways on a phone, and no field zooms the page on a touch screen.

### Project

- CI on every pull request: `cargo fmt`, `clippy -D warnings`, tests, MSRV 1.85, and the site's wasm, build and Playwright run.
- A release workflow that builds the four binaries on a `v*` tag matching `Cargo.toml`.
- Dependabot with a 7-day cooldown on version updates; security updates are not delayed.

[Unreleased]: https://github.com/tickerzhq/typeshi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tickerzhq/typeshi/releases/tag/v0.1.0
