chapter: rules
title: seethe
check: ok
rust: .map_err(
---
`size as u32` silently cuts off anything over 4,294,967,295. In money code that's how 5 billion becomes 705 million.

`seethe!(expr, "message")` takes something that can fail and, if it does, turns the failure into your own error code, Rust's `.map_err(...)?`.

**your move:** replace `size as u32` with `seethe!(u32::try_from(size), "too big for a u32. cope.")`.
