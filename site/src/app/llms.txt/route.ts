import content from "@/generated/content.json";
import { siteUrl } from "@/lib/site";

// llms.txt (llmstxt.org): what typeshi is and every keyword, for an AI agent asked to write it.
// Built from the same content.json as the pages, so it can't drift from the compiler.

export const dynamic = "force-static";

const plain = (s: string) => s.replace(/\*\*/g, "");

export function GET() {
  const base = siteUrl();
  const gm = content.examples.find((e) => e.id === "gm_counter");
  const lines = [
    "# typeshi",
    "",
    "> lock in fn. A joke language that really works: slang over Rust that compiles to real Solana programs (Anchor 1.2). `rug!()` is a compile error.",
    "",
    `typeshi ${content.version} is a source-to-source compiler: it reads \`.shi\` files as Rust tokens, rewrites the slang into plain Anchor Rust, and writes the \`.rs\` next to it. The generated Rust is ordinary Anchor you can read and audit. Errors keep the file, line and column of the \`.shi\` you wrote. Install: \`cargo install --git https://github.com/tickerzhq/typeshi\`, then \`typeshi new gm_counter && cd gm_counter && typeshi check\`.`,
    "",
    "## Docs",
    "",
    `- [The tour](${base}/tour): ${content.tour.length} short lessons, each checked by the real compiler in the browser`,
    `- [Playground](${base}/play): write typeshi and see the Rust it becomes`,
    `- [How it's built](${base}/built): the compiler, the wasm build, the site, the design tokens and the checks`,
    "- [README](https://github.com/tickerzhq/typeshi#readme): commands, flags, editor support",
    `- [Design tokens](${base}/tokens/typeshi.resolver.json): the site's colors, type, space and motion (DTCG 2025.10)`,
    "- [DESIGN.md](https://github.com/tickerzhq/typeshi/blob/main/site/DESIGN.md): how the site looks and why",
    "",
    "## Keywords",
    "",
    "| typeshi | Rust / Anchor |",
    "|---|---|",
    ...content.keywords.map((k) => `| ${k.shi} | ${k.rust} |`),
    "",
    content.confessions,
    "",
    "## Banned moves (each one is a compile error)",
    "",
    ...content.banned.map(([name, why]) => `- \`${name}!\`: ${why}`),
    "",
    "## Fixed error codes (the same in every typeshi program)",
    "",
    ...content.fixedErrors.map(([name, msg], i) => `- 0x${i + 1} \`${name}\`: ${msg}`),
    "",
    "## A whole program",
    "",
    "```rust",
    (gm?.source ?? "").trimEnd(),
    "```",
    "",
    "## The tour",
    "",
    ...content.tour.map((l) => `- [${l.title}](${base}/tour/${l.slug}) (${l.chapter}): ${plain(l.body.split("\n\n")[0])}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
