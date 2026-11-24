# Where typeshi is going

Decided 2026-11-23. Sources are linked inline; anything not checked says so.

## The decision

typeshi becomes **the type system for money**: a language whose compiler knows two things
about every amount and every account, on every target it compiles to.

1. **Money has owners.** Nothing moves or changes an owned account unless the code ties it
   to someone allowed to. Deny by default; `public` says "anyone, on purpose".
2. **Money has units.** An amount carries its asset and decimals, a price carries its base
   and quote. Adding USDC (6 decimals) to SOL (9), or using a cbETH/ETH ratio where a
   cbETH/USD price belongs, is a compile error.

The slang stays in the keywords and the voice. The refusals are real, coded (`SHI001`),
explained (`typeshi explain`), and every explanation's examples are tests.

## Why this, with evidence

- **Owners.** Cashio lost $52.8M (2022-03-23) because accounts were never tied together
  ([CertiK](https://www.certik.com/blog/cashio-app-incident-analysis)); a legacy Raydium
  program lost about $1.34M the same way on 2026-06-10 (researcher report, no official
  post-mortem). Anchor's `has_one` is opt-in. Move makes ownership a type, but only on
  MoveVM: Sui has $343M in DeFi, Solana $4.69B ([DefiLlama](https://defillama.com/chain/solana),
  2026-11-20).
- **Units.** Moonwell's oracle used a cbETH/ETH ratio as a USD price: $1.78M of bad debt,
  2026-02-15, in commits co-authored by an AI model
  ([Moonwell](https://forum.moonwell.fi/t/mip-x43-cbeth-oracle-incident-summary/2068)).
  Cetus lost $223M on Sui to a fixed-point shift
  ([Cyfrin](https://www.cyfrin.io/blog/inside-the-223m-cetus-exploit-root-cause-and-impact-analysis)).
  Off-chain, Citi sent about $900M instead of $7.8M to Revlon's lenders
  ([SDNY](https://www.nysd.uscourts.gov/sites/default/files/2021-02/20cv6539%20Citibank%20Opinion.pdf)).
  No language checked refuses unit or scale mismatches in money, on any chain.
- **Code bugs are most incidents.** In the first half of 2026, code vulnerabilities were 204
  of 344 incidents ([CertiK](https://www.certik.com/certik-report/hack3d/certik-hack3d-h1-2026-report)).
- **AI writes more of this code, and attacks it.** LLMs chose the insecure option in 45% of
  tasks ([Veracode](https://www.veracode.com/blog/genai-code-security-report), 2025-07-30);
  AI agents reproduced 55.8% of post-cutoff exploits in simulation
  ([Anthropic](https://www.anthropic.com/research/smart-contracts), 2025-12-01). A compiler
  that refuses with a code and an exact fix is something an agent can act on.
- **Agents now spend money, and their limits are scattered.** Coinbase's policy engine
  allows what no rule mentions; Turnkey denies it
  ([CDP](https://docs.cdp.coinbase.com/wallets/security-and-policies/policy-engine/overview),
  [Turnkey](https://docs.turnkey.com/features/policies/overview)). Agent losses (AIXBT,
  Bankrbot) were failures of who may spend. Nobody compiles one checked policy to all of them.

## What we are not doing, and why

- **Faster than Rust at run time.** typeshi compiles to Rust, so it runs at Rust's speed.
  It can be faster to write and to check, and cheaper on-chain (a Pinocchio target).
- **Every target at once.** Multi-target money languages have stayed thin or unused: Solang
  has no asset semantics, Quorlin shows no users, Flint and Obsidian stayed in research.
  A target ships only when its checks are real and tested.
- **Stolen keys.** Most dollars lost since 2024 were keys, laptops and credentials, not code
  (Binance, Bybit, Drift). No compiler stops that, and we won't claim it does.
- **Replacing Pine Script.** TradingView's lock-in is in its Terms, not its language.

## The order

1. **Owners on Solana.** Done: `SHI001`, `public`, `typeshi explain`, tested pages.
2. **Units.** Money types (asset and decimals; prices with base and quote). `SHI002`
   refuses mixing them; the Rust typeshi writes uses zero-cost newtypes, so rustc agrees.
3. **The rest of Solana's gaps**, by money lost: unverified accounts in sysvar reads
   (Wormhole, about $326M), unchecked raw accounts (Crema, Texture), unchecked CPI targets
   (Loopscale).
4. **Agent spending policies.** One typeshi policy, deny by default, refused if anything is
   unlimited, compiled to Coinbase CDP, Turnkey, Privy, Stripe and AP2 mandates.
5. **EVM**, then off-chain Rust and TypeScript, where Tickerz, trading and payments code live.

## How it fails, and what we do about it

- **The joke costs trust.** People buying money code want proof. The errors speak plainly,
  every claim has a source, and every check page is a test.
- **The dollars are in keys.** Lead with incident counts and AI-written code, not headline
  losses.
- **Too wide.** Each step above ships on its own and is useful alone.
