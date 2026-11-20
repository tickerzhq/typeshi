chapter: rules
title: rekt
check: ok
rust: return err!(Cope::TooBig);
---
You don't need a `cope` block for every error. `rekt!("message")` returns an error on the spot, and your message becomes a new error code, named for you.

`its_so_over!` and `L(...)` do the same with a `Cope` entry you already declared. `fired!("message")` panics, which you should almost never want.

**your move:** reject huge trades. Inside the `bull` block, add `rekt!("too big");`. Then find `TooBig` in `lib.rs`.
