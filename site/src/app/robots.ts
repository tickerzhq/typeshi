import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Shared programs are people's scratch work, not pages to index.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/p/"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
