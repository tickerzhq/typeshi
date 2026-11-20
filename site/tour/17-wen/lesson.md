chapter: rules
title: wen
check: ok
rust: unix_timestamp <=
---
Programs can read the clock. `wen!(ts)` fails before `ts`: the desk isn't open yet, dev is on vacation (error 0x4). `hodl!(ts)` does the same.

`touch_grass!(deadline)` fails after `deadline`. Both compare against the chain's unix timestamp.

**your move:** the desk opens but never closes. Under the `wen!` line, add `touch_grass!(per_my_last_email!(desk.closes_at));`.
