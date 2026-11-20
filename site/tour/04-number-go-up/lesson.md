chapter: basics
title: number go up
check: ok
rust: checked_add
---
`lock_in fn` is an instruction that writes. `ctx` is always the first parameter, `-> W` means it can fail, and `were_so_back!()` means it didn't.

`number_go_up!(counter.gms)` adds one, with overflow checked, because this is money code. `aura_farm!(counter.aura, 10)` adds ten and logs it.

**your move:** `gm` does nothing yet. Make the number go up: add `number_go_up!(counter.gms);` before `were_so_back!()`.
