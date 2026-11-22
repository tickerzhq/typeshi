import { ImageResponse } from "next/og";
import content from "@/generated/content.json";
import { c, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";

export const alt = "The compiler has opinions: the banned moves typeshi refuses to compile.";
export const size = ogSize;
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()} eyebrow="opinions" path="/opinions">
        <div style={{ display: "flex", fontSize: 66, fontWeight: 700, letterSpacing: -4, marginBottom: 30 }}>the compiler has opinions.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {content.banned.slice(0, 4).map(([name, why]) => (
            <div key={name} style={{ display: "flex", fontSize: 27, gap: 24 }}>
              <div style={{ display: "flex", width: 330, color: c["state-error"] }}>{`${name}!`}</div>
              <div style={{ display: "flex", color: c["text-secondary"] }}>{why}</div>
            </div>
          ))}
        </div>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
