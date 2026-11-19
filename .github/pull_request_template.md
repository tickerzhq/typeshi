## what changed

## how you checked it

- [ ] `cargo fmt --all --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`
- [ ] if the compiler's output changed: `cargo run -- build examples/trenches --emit-only` and the regenerated `.rs` is committed
- [ ] if you added a keyword or banned move: the grammar in `editors/vscode` and the README know it
