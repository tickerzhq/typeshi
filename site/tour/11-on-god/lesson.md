chapter: accounts
title: prints are forever
check: error
error: nobody can edit it
---
`#[on_god]` on a frame means immutable: written once, when the account is created, and never again. The compiler enforces it. Any `mut` on that account, or any write to it, fails to compile.

Sometimes the lesson is the error.

**your move:** break it on purpose. In `cap_table Edit`, put `#[account(mut)]` on the line above `print` and read what the compiler says.
