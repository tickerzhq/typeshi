import type { MetadataRoute } from "next";
import { homeMeta } from "@/lib/meta";
import { colors } from "@/lib/tokens";

export const dynamic = "force-static";

// Lets a phone or a desktop browser install typeshi like an app. The icons are scripts/icons.mjs's: the
// header's fn tile, and a full-bleed one Android can crop to any shape. Colors are the dark theme's page,
// the site's default look.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "typeshi",
    short_name: "typeshi",
    description: homeMeta.social,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: colors.dark["surface-page"],
    theme_color: colors.dark["surface-page"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
