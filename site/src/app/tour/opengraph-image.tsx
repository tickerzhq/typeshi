import { ImageResponse } from "next/og";
import content from "@/generated/content.json";
import { c, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";

export const alt = "The typeshi tour: learn typeshi by breaking it.";
export const size = ogSize;
export const contentType = "image/png";

export default async function OG() {
  const chapters = [...new Set(content.tour.map((l) => l.chapter))];
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()} eyebrow="the tour" path="/tour">
        <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -6, lineHeight: 1 }}>learn typeshi</div>
        <div style={{ display: "flex", fontSize: 104, fontWeight: 700, letterSpacing: -6, lineHeight: 1.05 }}>by breaking it.</div>
        <div style={{ display: "flex", fontSize: 30, color: c["text-secondary"], marginTop: 26 }}>
          {`${content.tour.length} lessons, checked live by the real compiler. no install.`}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 30 }}>
          {chapters.map((ch) => (
            <div key={ch} style={{ display: "flex", fontSize: 22, color: c["accent-text"], border: `2px solid ${c["border-strong"]}`, borderRadius: 999, padding: "8px 18px" }}>
              {ch}
            </div>
          ))}
        </div>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
