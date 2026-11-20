chapter: money
title: not financial advice
check: ok
rust: system_program::transfer
---
`full_send!(ser => kol, lamports)` moves SOL. Any instruction that moves money has to say `// not financial advice` on the line above it, or it doesn't compile. Compliance has been notified.

The same goes for `printer_go_brrr!`, `vc_unlock!` and the rest of the money moves.

**your move:** add `// not financial advice` on its own line, right above `lock_in fn tip`.
