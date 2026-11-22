# brand

typeshi's mark is the `fn` tile: `fn` in Geist Mono Bold, dark on a lime tile with corners a sixth of its side.
It sits beside the name in the site's header, and it is every icon: the browser tab, the home screen, the
share cards, the pictures here. Nothing is drawn by hand. The letters are Geist Mono's own outlines, read out of
the font by [`site/scripts/glyphs.mjs`](../site/scripts/glyphs.mjs), and every color is a design token. The rest
of the look is the compiler: what `typeshi check` really prints, set in Geist Mono.

| File | Size | For |
|---|---|---|
| `social-preview.png` | 1280×640, under 1 MB | GitHub's social preview (Settings → Social preview), and any link card. The site's home share card, at GitHub's size |
| `readme-dark.png`, `readme-light.png` | 1660×760, shown at 830 | The README header, on GitHub's light and dark pages |
| `preview.txt` | | The exact compiler output the pictures show |
| `playground-dark.png`, `playground-light.png` | 2560×1406, shown at 830 | The README's demo: the real playground compiling the starter program, retaken by `site/scripts/readme-shot.mjs` |

The icons live with the site, drawn by [`site/scripts/icons.mjs`](../site/scripts/icons.mjs) (`npm run icons`):
`favicon.ico` (16, 32, 48), `icon.svg`, a 180 px `apple-icon.png`, and the manifest's 192, 512 and maskable 512.
Every page's share card is drawn at build by `site/src/lib/card.tsx`. Both are in [`site/DESIGN.md`](../site/DESIGN.md).

## The mark

- The tile is lime (`accent-fill`, `#b6f259`) in both themes, and `fn` on it is `text-on-accent` (`#11190a`), the
  same pair as the one button on every page. `fn` is the word lime already sets in the headline, `lock in fn.`
- Beside it, the name: `typeshi` in Geist Mono Bold. Nothing else: no tagline in the lockup, no gradient, no outline.
- In a tab with a light theme the tile gets a hairline in the light theme's green (`#3f7b04`), because lime on
  white has almost no edge. That is the only variant.
- Don't redraw it, recolor it or set `fn` in another face. Change the tokens or `icons.mjs` and run `npm run icons`.

## Colors

The README header sits on GitHub's own page color, so it reads as part of the page. Everything on it, and on
the social preview, is a token from `site/tokens/`:

| | dark | light |
|---|---|---|
| page | `#0d1117` (GitHub), `#090a0c` on the social preview (`surface-page`) | `#ffffff` (GitHub) |
| text (`text-primary`) | `#eeeef0` | `#191a1d` |
| quiet: `$`, rustc's gutter (`text-tertiary`) | `#87898f` | `#696c73` |
| error and ngmi (`state-error`) | `#ff6b65` | `#c92324` |
| `fn` in the headline (`accent-text`) | `#b6f259` | `#3f7b04` |

## Keeping it true

```sh
cargo build --release
node brand/make.mjs
```

`make.mjs` runs the compiler on `tests/fixtures/rug.shi` and redraws all three pictures from what it says, in
Geist and Geist Mono from `site/src/fonts`, with the tile from `site/scripts/icons.mjs` and the colors from
`site/scripts/tokens.mjs`.
`tests/brand.rs` compares today's output with `preview.txt`, so when a message changes, `cargo test` fails
until the pictures are redrawn. On a new machine: `cd brand && npm install && npx playwright install chromium`.

## Voice

The compiler is the voice: lowercase, deadpan, short, trench slang that is always precise about what went
wrong. A joke that hides the error is a bad joke. Every message still says the file, the line and the reason.

- Do: `error: not on our watch, anon` then the exact line and `` `rug!` is a banned move``.
- Don't: a joke with no location, or a location with no joke.
- Do: name the real Rust it becomes (`declare_id!`, `Result<()>`). Don't: hide the generated code.
