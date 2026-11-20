chapter: rules
title: few_understand
check: ok
rust: let fee = fee_on(size)?;
---
Not every function is an instruction. `few_understand fn` is a private helper: no `ctx`, nobody outside can call it.

`-> W<u64>` means it returns a `u64` or an error, and `were_so_back!(fee)` returns the value. Call it with `?` so an error stops the instruction.

**your move:** `fee_on` exists but nobody calls it. In `trade`, replace `bps!(size, FEE_BPS)` with `fee_on(size)?`.
