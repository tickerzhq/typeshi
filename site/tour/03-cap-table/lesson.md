title: cap_table
check: ok
rust: pub struct Gm<'info>
---
An instruction needs to know which accounts are in the room. That list is a `cap_table`, and its name matches the instruction: `fn gm` uses `cap_table Gm`. typeshi adds the lifetimes Anchor wants.

People get shorthands with their types filled in: `anon` is anyone who signs, `ser` is the caller who pays fees, `cabal` is the admin, `exit_liquidity` pays for new accounts.

**your move:** `gm` has no cap_table. Add one above it:

```
cap_table Gm {
    #[account(mut)]
    counter: Account<Counter>,
    anon,
}
```
