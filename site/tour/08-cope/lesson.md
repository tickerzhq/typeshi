title: cope
check: ok
rust: return err!(Cope::DeskClosed)
---
Name your own errors in a `cope` block: `DeskClosed = "desk is closed. touch grass."`. Each one gets the next code in `enum Cope`, with your message in the IDL.

`its_so_over!(Cope::DeskClosed)` returns that error and ends the instruction.

**your move:** the desk has a `cope` entry but never uses it. Inside the `bull` block, add `its_so_over!(Cope::DeskClosed);`.
