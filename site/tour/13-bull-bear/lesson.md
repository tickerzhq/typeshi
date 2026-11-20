chapter: rules
title: bull and bear
check: ok
rust: } else {
---
`bull condition { } bear { }` is `if` and `else`. `diamond_hands` is `true`, `paper_hands` is `false`.

`mark_to_market!(desk.whale = diamond_hands)` writes a field.

**your move:** add a `bear` branch so that small trades (the ones that aren't whales) count toward `volume` with `number_go_up!(desk.volume, size);`.
