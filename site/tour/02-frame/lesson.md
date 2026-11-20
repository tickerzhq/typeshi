title: frame
check: ok
rust: pub aura: u64
---
A program keeps its state in accounts. A `frame` describes what one holds. typeshi turns it into an Anchor `#[account]` struct and works out its size for you.

Every field is public. You never write `pub`.

**your move:** add a second field, `aura: u64`, to `Counter`. Watch it show up in `lib.rs`.
