import type { Metadata } from "next";

const LLMS = { "text/plain": "/llms.txt" };

/**
 * A page's title, description, canonical address and link preview text. Next merges metadata one level
 * deep, so a page that set only its title used to inherit the home's og:title and twitter:title; this sets
 * all of them. The preview image itself is the route's own opengraph-image (src/lib/card.tsx).
 */
export function pageMeta({ path, title, description }: { path: string; title: string; description: string }): Metadata {
  const full = `${title} · typeshi`;
  return {
    title,
    description,
    alternates: { canonical: path, types: LLMS },
    openGraph: { title: full, description, url: path, siteName: "typeshi", type: "website" },
    twitter: { card: "summary_large_image", title: full, description },
  };
}

/** The home's, which is also every page's fallback. */
export const homeMeta = {
  title: "typeshi: lock in fn.",
  description:
    "A language for code that moves money: slang over Rust that compiles to real Solana programs (Anchor 1.2). The bugs behind real exploits are compile errors, and so is rug!(). Try the real compiler in your browser.",
  social: "Slang over Rust that compiles to real Solana programs. The bugs that drain them don't compile.",
  alternates: LLMS,
};
