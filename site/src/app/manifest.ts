import type { MetadataRoute } from "next";
import { colors } from "@/lib/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "typeshi",
    short_name: "typeshi",
    description: "Slang over Rust that compiles to real Solana programs. rug!() is a compile error.",
    start_url: "/play",
    display: "standalone",
    background_color: colors.dark["surface-page"],
    theme_color: colors.dark["surface-page"],
    categories: ["developer", "education", "entertainment"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "playground", url: "/play" },
      { name: "tour", url: "/tour" },
    ],
  };
}
