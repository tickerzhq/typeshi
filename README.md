# typeshi

**lock in fn.**

typeshi is a joke programming language that is also real and works. It is a slang layer over Rust that compiles to real Solana programs (Anchor). You write `.shi`, `typeshi build` turns it into plain Anchor Rust, and `anchor build` turns that into a program you can deploy. The jokes are in the keywords, and most of all in the compiler output.

```text
$ typeshi build
your build is vesting. 6-month cliff. come back later.
(jk. building anyway.)
error: you tried to edit a print. nobody can edit it.
 --> edit_a_print.shi:8:19
  |
8 |         #[account(mut)]
  |                   ^^^ `PrintRecord` is #[on_god]: written once, at init

error: you tried to edit a print. nobody can edit it.
  --> edit_a_print.shi:14:9
   |
14 |         mark_to_market!(print.value = value);
   |         ^^^^^^^^^^^^^^^ prints are forever. that's the product

error: absolutely not.
  --> friday.shi:13:9
   |
13 |         deploy_on_friday!();
   |         ^^^^^^^^^^^^^^^^^ `deploy_on_friday!` is a banned move

error: the feds are monitoring the situation
  --> friday.shi:14:9
   |
14 |         insider_trading!(version.n);
   |         ^^^^^^^^^^^^^^^^ `insider_trading!` is a banned move

error: `promote` moves money and never says `// not financial advice`.
  --> no_disclaimer.shi:14:16
   |
14 |     lock_in fn promote(ctx, fee: u64) -> W {
   |                ^^^^^^^ compliance has been notified

error: not on our watch, anon
  --> rug.shi:13:9
   |
13 |         rug!(pool);
   |         ^^^^ `rug!` is a banned move

warning: you trusted the dev. classic.
  --> warnings.shi:13:9
   |
13 |         trust_the_dev!(size mogs 0);
   |         ^^^^^^^^^^^^^^ this check is skipped. that's the feature

warning: unused variable `revenue`. as is tradition.
  --> warnings.shi:12:38
   |
12 |     lock_in fn trade(ctx, size: u64, revenue: u64) -> W {
   |                                      ^^^^^^^ pre-revenue. post-vibes.

warning: no tests found. the trenches are proud of you.
skill issue.
ngmi

$ typeshi build
...
have you tried turning your strategy off.
ngmi

$ typeshi build
...
even the bots are laughing.
ngmi
```

When it does build:

```text
$ typeshi test --arch v1
locked in: programs/print_feed/src/lib.shi -> programs/print_feed/src/lib.rs
    Finished `release` profile [optimized] target(s)
running 1 test
cortisol: 10476 CU (one print)
test print_feed_locks_in ... ok
cortisol: 10,476 CU. mid.
all tests passed on the first try. this is a honeypot.
wagmi

$ typeshi build --arch v1 --gigamaxx --leverage 100x
compiling 100x faster.
    Finished `release` profile [optimized] target(s)
trenches: mcap $91.46M. your program is down 51% since you started typing.
cortisol: 10,476 CU. mid.
wagmi

$ typeshi --fud
this codebase has more TODOs than holders.

$ typeshi wen moon
soon™
```

Every line above is real output, trimmed of cargo's compile noise. The failing files are in [`tests/fixtures/`](tests/fixtures). Exit code 0 is wagmi. Exit code 1 is ngmi.

## `rug!()` is a compile error

Add one line to the example's `list_ticker` (line 70 of [`examples/trenches/programs/print_feed/src/lib.shi`](examples/trenches/programs/print_feed/src/lib.shi)):

```rust
    lock_in fn list_ticker(ctx, ticker: Ticker) -> W {
        trust_me_bro!(ticker[0] != 0, "a ticker needs a name. skill issue.");
        mark_to_market!(feed.ticker = ticker);
        mark_to_market!(feed.cabal = per_my_last_email!(exit_liquidity).key());
        probably_nothing!("gm. new ticker listed.");
        rug!(feed);
        were_so_back!()
    }
```

```text
$ typeshi build
your build is vesting. 6-month cliff. come back later.
(jk. building anyway.)
error: not on our watch, anon
  --> programs/print_feed/src/lib.shi:70:9
   |
70 |         rug!(feed);
   |         ^^^^ `rug!` is a banned move

skill issue.
ngmi
```

The build stops there, before `anchor build`. Exit code 1. Real output from `typeshi build` in `examples/trenches`, with the other program's warnings trimmed.

## The example: a Tickerz print feed

```rust
gm!("7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj");

stealth_launch print_feed {
    type_shi Ticker = [u8; 8];

    #[on_god]
    const MAX_PRINT: Bps = 1_000_000;

    frame Feed {
        ticker: Ticker,
        cabal: Pubkey,
        prints: u64,
        aura: u64,
    }

    /// one print. written once, at init. nobody can edit it.
    #[on_god]
    frame PrintRecord {
        feed: Pubkey,
        seq: u64,
        value: Bps,
        printed_by: Pubkey,
        printed_at: i64,
    }

    alpha_leak Printed { ticker: Ticker, seq: u64, value: Bps, pretty: String }

    cap_table Print {
        #[account(mut, has_one = cabal, seeds = [b"feed", feed.ticker.as_ref()], bump)]
        feed: Account<Feed>,
        #[account(rent_free, payer = exit_liquidity, space = 8 + PrintRecord::INIT_SPACE,
                  seeds = [b"print", feed.key().as_ref(), &feed.prints.to_le_bytes()], bump)]
        print: Account<PrintRecord>,
        cabal,
        exit_liquidity,
        system_program,
    }

    /// print a value. it lives on-chain forever.
    #[tokenmaxx]
    lock_in fn print(ctx, value: Bps) -> W {
        trust_me_bro!(value mogs 0, "a print of zero is not a print.");
        funds_are_safu!(value <= MAX_PRINT);
        let seq = per_my_last_email!(feed.prints);
        mark_to_market!(print.seq = seq);
        mark_to_market!(print.value = value);
        mark_to_market!(print.printed_at = Clock::get()?.unix_timestamp);
        number_go_up!(feed.prints);
        aura_farm!(feed.aura, 10);
        probably_nothing!(Printed {
            ticker: per_my_last_email!(feed.ticker),
            seq,
            value,
            pretty: looksmaxx!(value),
        });
        were_so_back!()
    }

    /// there is no edit instruction. this fn exists to tell you why.
    few_understand fn edit(_print: &PrintRecord, _value: Bps) -> W {
        L("nobody can edit it. skill issue.")
    }
}
```

The full file is [`examples/trenches/programs/print_feed/src/lib.shi`](examples/trenches/programs/print_feed/src/lib.shi), and the Rust it compiles to is committed right next to it as [`lib.rs`](examples/trenches/programs/print_feed/src/lib.rs), so you can read exactly what every keyword does. A LiteSVM test runs the compiled program: it lists a ticker, prints twice, checks that a zero print fails with the right error code, and says gm.

The second example, [`degen_desk`](examples/trenches/programs/degen_desk/src/lib.shi), uses every other keyword so the compiler checks all of them. It is a toy. Do not run a desk on it.

## Keywords

### Program shape

| typeshi | what it compiles to |
|---|---|
| `gm!("<program id>")` | `declare_id!` |
| `stealth_launch name { }` | the program: `#[program] pub mod name`, with everything else hoisted next to it |
| `frame Name { }` | an account's data layout: `#[account] #[derive(InitSpace)] pub struct` (bone structure) |
| `term_sheet Name { }` | same as `frame`, for the finance desk |
| `cap_table Name { }` | the accounts an instruction touches: `#[derive(Accounts)] struct Name<'info>`, lifetimes added for you |
| `alpha_leak Name { }` | an event: `#[event] pub struct` |
| `cope { Name = "message", }` | your own error codes, added to `enum Cope` |
| `type_shi X = T;` | `pub type X = T;` (and inlined into frames so space is computed) |
| `deadass NAME: T = v;` | `pub const` |
| `#[on_god]` | immutable. On a frame: any `mut` on that account fails to compile. On a `const`: it's a const |
| `this_is_fine!();` | the program's panic handler (behind the `custom-panic` feature) |

### Functions

| typeshi | what it compiles to |
|---|---|
| `lock_in fn` | an instruction that writes on-chain, permanently. If its cap_table writes nothing, it fails to compile: "you are not locked in" |
| `ape fn` | any public instruction (reads are fine) |
| `few_understand fn` | a private helper fn |
| `ctx` (first param, no type) | `ctx: Context<PascalCaseOfTheFnName>` |
| `-> W` / `-> W<T>` / `-> ebitda` | `Result<()>` / `Result<T>` / `Result<()>` |
| `were_so_back!()` / `were_so_back!(v)` | `Ok(())` / `Ok(v)` |
| `L("message")` / `L(Cope::X)` | `err!(...)`. The message becomes an error code with that message |
| `its_so_over!("message")` / `rekt!(...)` | `return err!(...)` |
| `seethe!(expr, "message")` | `expr.map_err(...)?`: swap any error for yours |
| `fired!("message")` | `panic!`. Immediately |
| `#[tokenmaxx]` | strips that instruction's logs. Logs cost compute; events stay |
| `#[vc_backed]` | locks the instruction for 4 years (from 2026-01-01, or `#[vc_backed(since = <unix>)]`). It is also slower |

### Control flow and values

| typeshi | Rust |
|---|---|
| `bull cond { } bear { }` | `if cond { } else { }` |
| `a mogs b` | `a > b` |
| `diamond_hands` / `paper_hands` | `true` / `false` |

### Inside a cap_table

| typeshi | Anchor |
|---|---|
| `ser` | `#[account(mut)] pub ser: Signer<'info>`, the caller |
| `exit_liquidity` | `#[account(mut)] pub exit_liquidity: Signer<'info>`, the one who pays the fees |
| `cabal` | `pub cabal: Signer<'info>`, the admin. Pair it with `has_one = cabal` |
| `anon` | `pub anon: Signer<'info>`, anyone at all |
| `kol` | `#[account(mut)] pub kol: SystemAccount<'info>`, where `kol_promo!` sends the fee |
| `system_program`, `token_program` | the programs, typed |
| `rent_free` | `init`. That is literally what init does: it makes the account rent-exempt |
| `golden_parachute = x` | `close = x`: the rent goes back to `x` when the account closes |
| `graduate = n` | `realloc = n`, paid by `exit_liquidity`: the account migrates to a bigger layout |
| `Account<Feed>`, `Signer`, ... | `'info` lifetimes added |

### Statements

| typeshi | what it does |
|---|---|
| `per_my_last_email!(feed.prints)` | reads `ctx.accounts.feed.prints` |
| `mark_to_market!(feed.price = v)` | writes it |
| `number_go_up!(feed.prints)` / `(x, n)` | adds 1 (or n), overflow checked |
| `aura_farm!(feed.aura, n)` | adds n points and logs `+n aura` |
| `ascend!(desk.version)` | bumps a stored layout version during a migration |
| `bags!(ser)` | the account's lamports |
| `trust_me_bro!(cond)` | `require!`. Default error: "per my last email, no." |
| `funds_are_safu!(cond)` | `require!`. Default error 0x3: "funds are not safu" |
| `margin_call!(cond)` | fails when `cond` is true. Default error 0x2: "you are exit liquidity" |
| `wen!(ts)` / `hodl!(ts)` | fails before `ts`. Default error 0x4: "dev is on vacation" |
| `touch_grass!(deadline)` | fails after `deadline`: "ngmi. touch grass." |
| `fren!(key in list)` | allowlist check: "npc detected. not a fren." |
| any of the above `, "message"` or `, cuz "message"` | your own message becomes an error code |
| `probably_nothing!("fmt", ..)` / `probably_nothing!(Event { .. })` | `msg!` / `emit!` |
| `looksmaxx!(1234567)` | `"1.23M"` |
| `bps!(amount, rate)` | `amount * rate / 10_000`, overflow checked |
| `bonding_curve!(supply, base, slope)` | `base + slope * supply`, overflow checked |
| `bundled! { ... }` | runs the calls together. A Solana instruction lands whole or not at all, so this is true |
| `full_send!(from => to, lamports)` | a System Program transfer. Not enough lamports: error 0x6, "wife changing money not found" |
| `printer_go_brrr!(mint => bag, amount, authority)` | SPL `mint_to` |
| `lp_burned!(bag => mint, amount, authority)` | SPL `burn` |
| `mint_revoked!(mint, authority)` | sets the mint authority to none |
| `freeze_revoked!(mint, authority)` | sets the freeze authority to none |
| `liquidated!(acc => dest)` | closes the account and sends its lamports to `dest` |
| `layoffs!(a, b, c => dest)` | closes several. Logs "we're a family. was." |
| `hostile_takeover!(desk.cabal => new_key)` | hands over authority. "new management, same roadmap." |
| `mew!()` | nothing. Silently |
| `wen_moon()` | `"soon™"` |

### Confession macros (they do exactly what the name says)

| typeshi | what it does |
|---|---|
| `vc_unlock!(mint => vc, authority)` | mints 40% of the current supply to the `vc` account and logs "probably nothing." |
| `kol_promo!(fee)` | logs "#ad not financial advice", then charges `ser` the fee and sends it to `kol` |
| `airdrop!()` | logs "points are not a token. points will never be a token. wen token?" and does nothing else |
| `audit!(by = "vibes")` | always passes |
| `bullish!(result)` | turns any error into a success and logs "this is actually bullish" |
| `trust_the_dev!(check)` | skips the check. The compiler warns: "you trusted the dev. classic." |
| `sell_the_bottom!(price, floor, { .. })` | runs only when the price is at its worst for a seller. Just like you |
| `buy_the_top!(price, ath, { .. })` | runs only when the price is at its worst for a buyer |

### Banned moves (they do not compile)

| typeshi | the compiler says |
|---|---|
| `rug!` | not on our watch, anon |
| `honeypot!` | ser, this is a Wendy's |
| `insider_trading!` | the feds are monitoring the situation |
| `dev_sold!` | dev didn't sell. dev never sells. |
| `exit_scam!` | exit scam? in this economy? |
| `ponzi!` | number go up is not a business model |
| `deploy_on_friday!` | absolutely not. |

### Lints

| you wrote | the compiler says |
|---|---|
| a write to a print in an fn named `edit`, or `mut` on an `#[on_god]` account | error: you tried to edit a print. nobody can edit it. |
| a fn that moves lamports or tokens without a `// not financial advice` comment | error: compliance has been notified |
| a `lock_in fn` whose cap_table writes nothing | error: you are not locked in |
| a variable named `revenue` that is never used | warning: unused variable `revenue`. as is tradition. |
| no tests anywhere | warning: no tests found. the trenches are proud of you. |
| `trust_the_dev!` | warning: you trusted the dev. classic. |

### Error codes

Every program gets `enum Cope`. The first six codes are the same in every typeshi program, forever:

| code | message |
|---|---|
| `0x1` | skill issue |
| `0x2` | you are exit liquidity |
| `0x3` | funds are not safu |
| `0x4` | dev is on vacation |
| `0x5` | rugged by a 19 year old |
| `0x6` | wife changing money not found |

Every message you write in `L("...")`, `its_so_over!("...")` or an assert gets the next code, with your message in the IDL.

## The CLI

```text
typeshi build [dir]      turn every .shi into Anchor Rust, then `anchor build`
typeshi test [dir]       build, then `cargo test`, then a verdict
typeshi expand <file>    print the Rust a .shi file turns into
typeshi fud [dir]        a roast of your code (also: typeshi --fud)
typeshi wen moon         answers the question
```

| flag | what it does |
|---|---|
| `--tokenmaxx` | builds with Anchor's `no-log-ix-name` feature (fewer compute units) |
| `--gigamaxx` | `--tokenmaxx`, every log stripped, release profile pinned to opt-level 3, fat LTO, one codegen unit. Overflow checks stay on |
| `--auramaxx` | prettier, colored output |
| `--leverage 100x` | prints "compiling 100x faster". Opt-in: a 1-in-100 chance the build fails with "liquidated." (Your files are never touched. Max leverage is 125x.) |
| `--emit-only` | write the `.rs` files and stop |

What else it does:

- The first build in a project says "your build is vesting. 6-month cliff. come back later." and then builds anyway.
- Every successful build prints a fake market cap for your program, down a different amount each time, worked out from the build time.
- Every build prints `cortisol: N CU.` with a verdict: goated (5,000 or less), mid (50,000 or less), it's over. The number is the most compute any program used in your last `typeshi test` (any test that prints `cortisol: <n> CU`, or Solana's own `consumed <n> of <m> compute units` log).
- Failed builds in a row escalate: skill issue. Then: have you tried turning your strategy off. Then: even the bots are laughing. Then: have you considered a career in sales. Then: ser, this is a Wendy's. The count lives in `target/typeshi/state`.
- `typeshi test` ends with "N passed, 0 failed. bullish." or "N failed. it's so over." If every test passes on the first run ever: "all tests passed on the first try. this is a honeypot."

There is also a git hook, [`hooks/commit-msg`](hooks/commit-msg), that rejects any commit message that does not start with gm, wagmi or "it's so over". Install it with `cp hooks/commit-msg .git/hooks/ && chmod +x .git/hooks/commit-msg`.

## Install and build

You need Rust, the Solana CLI (Agave) and Anchor 1.2. None of them need sudo.

```sh
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Solana (Agave): brings cargo-build-sbf
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
# Anchor 1.2: see https://www.anchor-lang.com/docs/installation (avm install 1.2.0)

# typeshi
cargo install --git https://github.com/tickerzhq/typeshi typeshi

# build the examples
git clone https://github.com/tickerzhq/typeshi && cd typeshi/examples/trenches
typeshi build --arch v1   # .shi -> .rs -> anchor build
typeshi test --arch v1    # builds, then LiteSVM runs the compiled print feed
```

Why `--arch v1`: Anchor 1.2 builds SBPF v3 by default, and the LiteSVM version Anchor's own template ships (0.10) runs v1 programs but rejects v3 ones. `--arch` is passed straight to `anchor build`; leave it off to get Anchor's default.

To start your own program, copy `examples/trenches`, change the program ids in `Anchor.toml` and `gm!(...)`, and write `programs/<name>/src/lib.shi`. `typeshi build` writes `lib.rs` next to it. Don't edit `lib.rs`. Nobody can edit it.

## How it works

typeshi is a source-to-source compiler, not a proc macro. It reads `.shi` as Rust tokens (with real line and column numbers, which is how the error messages point at your code), rewrites the slang into plain Anchor, then parses the result with `syn` and prints it with `prettyplease`. The output is ordinary Rust that you can read, audit and build with stock Anchor. That matters for something that will hold money on a public chain: the code that runs is the code you can see.

## Roadmap

1. Solidity backend: the same `.shi`, compiled to Solidity for EVM chains.
2. Then Arbitrum Stylus, Stellar Soroban, NEAR and CosmWasm.

## Credits

Inspired by the tradition of joke languages like cursed, ArnoldC and LOLCODE. This one is for the trenches and runs on Solana.

Made by [Tickerz](https://tickerz.com). Everything gets a ticker. Nobody can edit it.

## License

MIT. See [LICENSE](LICENSE).

## Disclaimer

typeshi is a parody of the name TypeScript. It is not affiliated with, endorsed by or connected to Microsoft or the TypeScript project. Nothing here is financial advice. The confession macros really do what they say, so read the generated Rust before you deploy anything.
