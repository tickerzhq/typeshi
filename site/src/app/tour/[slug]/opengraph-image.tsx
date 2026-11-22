import { ImageResponse } from "next/og";
import content from "@/generated/content.json";
import { c, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return content.tour.map((l) => ({ slug: l.slug }));
}

export async function generateImageMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = content.tour.find((x) => x.slug === slug);
  return [{ id: "card", alt: l ? `typeshi tour, lesson ${l.n}: ${l.title}` : "typeshi tour", size, contentType }];
}

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = content.tour.find((l) => l.slug === slug) ?? content.tour[0];
  const first = lesson.body.split("\n\n")[0].replace(/[`*]/g, "");
  const lede = first.length > 150 ? `${first.slice(0, 147).trimEnd()}…` : first;
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()} eyebrow={`tour · ${lesson.chapter}`} path={`/tour/${lesson.slug}`}>
        <div style={{ display: "flex", fontSize: 26, color: c["text-tertiary"] }}>{`lesson ${lesson.n} of ${content.tour.length}`}</div>
        <div style={{ display: "flex", fontSize: 112, fontWeight: 700, letterSpacing: -6, lineHeight: 1.05, marginTop: 6 }}>{lesson.title}</div>
        <div style={{ display: "flex", fontSize: 28, color: c["text-secondary"], marginTop: 20, lineHeight: 1.45, maxWidth: 1000 }}>{lede}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 34 }}>
          {content.tour.map((l) => (
            <div
              key={l.slug}
              style={{
                display: "flex",
                width: 34,
                height: 8,
                borderRadius: 4,
                background: l.n <= lesson.n ? c["accent-fill"] : c["border-default"],
                opacity: l.n < lesson.n ? 0.4 : 1,
              }}
            />
          ))}
        </div>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
