chapter: money
title: printer go brrr
check: ok
rust: mint_to(
---
Tokens on Solana are SPL tokens. A `mint` makes them and a token account holds them. `printer_go_brrr!(mint => bag, amount, cabal)` mints `amount` new tokens into `bag`, signed by `cabal`.

`lp_burned!` burns them, `mint_revoked!` and `freeze_revoked!` give up those powers for good. They all move money, so the `// not financial advice` is already there.

**your move:** turn the printer on. Add `printer_go_brrr!(mint => bag, amount, cabal);` inside `brrr`.
