import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // The site loads the compiler as /typeshi.wasm?v=<content hash> (src/generated/wasm.ts, written by
        // scripts/sync.mjs). A new build is a new URL, so that one is cached for good.
        source: "/typeshi.wasm",
        has: [{ type: "query", key: "v" }],
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Without the hash, always check: an old copy kept for an hour ran the previous compiler after a deploy.
        source: "/typeshi.wasm",
        missing: [{ type: "query", key: "v" }],
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default config;
