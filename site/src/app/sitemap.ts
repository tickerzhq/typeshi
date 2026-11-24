import type { MetadataRoute } from "next";
import content from "@/generated/content.json";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const page = (path: string, priority: number) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority });
  return [
    page("/", 1),
    page("/tour", 0.9),
    page("/play", 0.8),
    page("/exploits", 0.8),
    page("/opinions", 0.6),
    page("/keywords", 0.6),
    page("/built", 0.5),
    ...content.tour.map((l) => page(`/tour/${l.slug}`, 0.5)),
  ];
}
