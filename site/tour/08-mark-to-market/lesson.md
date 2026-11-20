chapter: accounts
title: mark_to_market
check: ok
rust: ctx.accounts.counter.cabal = ctx.accounts.exit_liquidity.key();
---
`mark_to_market!(counter.cabal = value)` writes a field. `per_my_last_email!(exit_liquidity)` reads an account, so `per_my_last_email!(exit_liquidity).key()` is its address.

Both expand to `ctx.accounts.…`, so you never type `ctx.accounts` yourself.

**your move:** whoever launches the counter becomes its cabal. In `launch`, before `were_so_back!()`, add:

```
mark_to_market!(counter.cabal = per_my_last_email!(exit_liquidity).key());
```
