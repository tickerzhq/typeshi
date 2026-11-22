import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
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
