chapter: the trenches
title: trust the dev
check: warning
warning: you trusted the dev
---
Confessions compile, and they do exactly what they say. `audit!(by = "vibes")` always passes. `airdrop!()` logs that points are not a token. `vc_unlock!` mints 40% of supply to the VC. `bullish!(result)` turns any error into a success.

`trust_the_dev!(check)` skips the check, and the compiler warns you, because that's the feature.

**your move:** in `trade`, change `trust_me_bro!(size mogs 0, "zero is not a trade")` to `trust_the_dev!(size mogs 0)`. Read the warning.
