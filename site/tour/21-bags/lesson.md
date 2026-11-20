chapter: money
title: bags
check: ok
rust: lamports() >= size
---
`bags!(account)` is an account's balance in lamports (a billionth of a SOL). `funds_are_safu!(condition)` fails with error 0x3, funds are not safu, unless the condition holds.

`looksmaxx!(n)` formats a number like `1.23M`, for logs.

**your move:** don't let anyone trade more than they hold. Add `funds_are_safu!(bags!(ser) >= size);` as the first line of `trade`.
