chapter: accounts
title: golden_parachute
check: ok
rust: close = cabal
---
Closing an account gives back the rent that was paid to keep it alive. `golden_parachute = cabal` closes it and sends that money to the cabal. It becomes Anchor's `close`.

`has_one = cabal` is plain Anchor: the desk's `cabal` field must match the `cabal` signing. Only the boss gets the parachute. `mew!()` does nothing, on purpose.

**your move:** `retire` says it closes the desk but doesn't. Add `golden_parachute = cabal` to the desk's `#[account(...)]`.
