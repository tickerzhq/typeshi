chapter: money
title: alpha_leak
check: ok
rust: emit!(Traded
---
Programs can announce what happened so apps and indexers can follow along. `alpha_leak Name { }` declares an event, Anchor's `#[event]`.

`probably_nothing!` with a string logs. Give it an event instead, `probably_nothing!(Traded { size })`, and it becomes `emit!`.

**your move:** leak the alpha. Before `were_so_back!()` in `trade`, add `probably_nothing!(Traded { size });`.
