# brand

typeshi has no logo on purpose. Its look is its compiler: the name set in a monospace face, and what
`typeshi check` really prints, in rustc's own colours. Nothing here is drawn by hand.

| File | Size | For |
|---|---|---|
| `social-preview.png` | 1280×640, under 1 MB | GitHub's social preview (Settings → Social preview), and any link card |
| `readme-dark.png`, `readme-light.png` | 1660×760, shown at 830 | The README header, matched to GitHub's light and dark pages |
| `preview.txt` | | The exact compiler output the pictures show |
| `playground-dark.png`, `playground-light.png` | 2560×1406, shown at 830 | The README's demo: the real playground compiling the starter program, retaken by `site/scripts/readme-shot.mjs` |
| `fonts/` | | JetBrains Mono, SIL Open Font License 1.1 (`fonts/OFL.txt`) |

Colours are GitHub's own, so the header sits on the page instead of in a box:

| | dark | light |
|---|---|---|
| page | `#0d1117` | `#ffffff` |
| text | `#e6edf3` | `#1f2328` |
| muted (`$`, the tagline) | `#8d96a0` | `#59636e` |
| error | `#ff7b72` | `#cf222e` |
| gutter and arrows | `#79c0ff` | `#0969da` |

## Keeping it true

```sh
cargo build --release
node brand/make.mjs
```

`make.mjs` runs the compiler on `tests/fixtures/rug.shi` and redraws all three pictures from what it says.
`tests/brand.rs` compares today's output with `preview.txt`, so when a message changes, `cargo test` fails
until the pictures are redrawn. On a new machine: `cd brand && npm install && npx playwright install chromium`.

## Voice

The compiler is the voice: lowercase, deadpan, short, trench slang that is always precise about what went
wrong. A joke that hides the error is a bad joke. Every message still says the file, the line and the reason.

- Do: `error: not on our watch, anon` then the exact line and `` `rug!` is a banned move``.
- Don't: a joke with no location, or a location with no joke.
- Do: name the real Rust it becomes (`declare_id!`, `Result<()>`). Don't: hide the generated code.
