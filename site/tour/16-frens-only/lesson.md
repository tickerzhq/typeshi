chapter: rules
title: frens only
check: ok
rust: .iter()
---
`fren!(key in list)` is an allowlist: the instruction fails unless `key` is in `list`. Here the desk keeps four frens in a fixed-size array.

`per_my_last_email!(ser).key()` is the caller's address.

**your move:** make the desk frens only. Add this as the first line of `trade`:

```
fren!(per_my_last_email!(ser).key() in per_my_last_email!(desk.frens));
```
