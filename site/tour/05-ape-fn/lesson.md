title: ape fn
check: ok
rust: pub fn peek(ctx: Context<Peek>)
---
`lock_in` is a promise: this instruction writes. If its cap_table has nothing writable, it doesn't compile. You are not locked in.

For instructions that only read, use `ape fn`. `per_my_last_email!(counter.gms)` reads a field, and `probably_nothing!` logs, like `msg!`.

**your move:** `peek` only reads. Change `lock_in fn` to `ape fn`.
