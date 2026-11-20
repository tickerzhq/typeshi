chapter: basics
title: deadass
check: ok
rust: pub const FEE_BPS: Bps = 250;
rust: bps((size) as u64, (FEE_BPS) as u64)
---
`deadass NAME: Type = value;` is a constant, Anchor's `pub const`. `type_shi Name = Type;` is a type alias. `Bps` is basis points: 250 means 2.5%.

`bps!(amount, rate)` takes that cut, overflow checked.

That bare `250` in `trade` is a magic number. Magic numbers are how desks blow up.

**your move:** add `deadass FEE_BPS: Bps = 250;` at the top of the program, then use `FEE_BPS` instead of `250` in `bps!`.
