import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // A shared program never changes, so its page and its preview can be cached hard at the edge.
        source: "/p/:code*",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400" }],
      },
      {
        // The compiler is content-addressed by deploy, so cache it hard at the edge and in the browser.
        source: "/typeshi.wasm",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
};

export default config;
