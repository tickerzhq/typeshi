title: banned moves
check: error
error: is a banned move
---
Some moves don't compile at all: `rug!`, `honeypot!`, `insider_trading!`, `dev_sold!`, `exit_scam!`, `ponzi!` and `deploy_on_friday!`. Each one is a real error with its own joke.

There are also confessions, which compile and do exactly what they say. `vc_unlock!` really mints 40% of supply to the VC. Read the generated Rust before you deploy anything.

**your move:** you've learned enough to be dangerous. Add `rug!(pool);` inside `exit` and get stopped.

That's the tour. To build for real: `cargo install --git https://github.com/tickerzhq/typeshi`, then `typeshi new my_program`.
