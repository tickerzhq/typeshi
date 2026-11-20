#!/usr/bin/env bash
# Rebuild the compiler for the browser. Needs: rustup target add wasm32-unknown-unknown,
# cargo install wasm-bindgen-cli --version <the wasm-bindgen in site/wasm/Cargo.lock>.
# Output is committed so Vercel never needs a Rust toolchain.
set -euo pipefail
here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here/wasm"
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target web --no-typescript --out-dir "$here/src/wasm" \
  target/wasm32-unknown-unknown/release/typeshi_wasm.wasm
mv "$here/src/wasm/typeshi_wasm_bg.wasm" "$here/public/typeshi.wasm"
# The glue's default path points next to itself; bundlers try to resolve it. The page always
# passes /typeshi.wasm explicitly, so point the default there too.
sed -i "s|new URL('typeshi_wasm_bg.wasm', import.meta.url)|'/typeshi.wasm'|" "$here/src/wasm/typeshi_wasm.js"
npx --yes -p binaryen@132.0.0 wasm-opt -Os --enable-bulk-memory --enable-nontrapping-float-to-int \
  "$here/public/typeshi.wasm" -o "$here/public/typeshi.wasm" \
  || echo "wasm-opt unavailable; shipping the unoptimized build"
ls -la "$here/public/typeshi.wasm"
