chapter: accounts
title: rent_free
check: ok
rust: init,
---
Accounts don't exist until someone pays to create them. `rent_free` creates the account. It becomes Anchor's `init`, and it's only free if you're not the one paying.

It needs three friends: `payer` (here `exit_liquidity`, who pays the rent), `space` (how many bytes: 8 for Anchor's tag plus `Counter::INIT_SPACE`, which typeshi works out) and `seeds` with `bump`, so the account lives at an address the program can find again.

The compiler says `launch` writes nothing, and it's right: without `rent_free`, the counter is only read. Its hint says to use `ape fn`. Not this time.

**your move:** `launch` is meant to create the counter. Add `rent_free, ` at the start of the `#[account(...)]` list.
