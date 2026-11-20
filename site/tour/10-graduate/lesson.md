chapter: accounts
title: graduate
check: ok
rust: realloc = 8+Desk::INIT_SPACE+64
---
Accounts have a fixed size. To add fields later, the account has to grow. `graduate = n` resizes it to `n` bytes, and `exit_liquidity` pays for the extra room. It becomes Anchor's `realloc`.

`ascend!(desk.version)` bumps a layout version and logs it, so you can tell old accounts from new ones.

**your move:** make `grow` actually grow. Add `graduate = 8 + Desk::INIT_SPACE + 64` to the desk's `#[account(...)]`.
