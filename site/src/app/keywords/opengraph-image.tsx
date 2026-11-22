import { ImageResponse } from "next/og";
import content from "@/generated/content.json";
import { c, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";

export const alt = "Every typeshi keyword and the Rust or Anchor it becomes.";
export const size = ogSize;
export const contentType = "image/png";

const rows: [string, string][] = [
  ["gm!(id)", "declare_id!"],
  ["stealth_launch", "#[program] pub mod"],
  ["frame", "#[account] pub struct"],
  ["cap_table", "#[derive(Accounts)]"],
  ["-> W", "Result<()>"],
  ["were_so_back!()", "Ok(())"],
];

export default async function OG() {
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()} eyebrow="keywords" path="/keywords">
        <div style={{ display: "flex", fontSize: 80, fontWeight: 700, letterSpacing: -5, marginBottom: 30 }}>
          {`${content.keywords.length} rows of slang.`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map(([shi, rs]) => (
            <div key={shi} style={{ display: "flex", fontSize: 27, gap: 24 }}>
              <div style={{ display: "flex", width: 320, color: c["accent-text"] }}>{shi}</div>
              <div style={{ display: "flex", color: c["text-tertiary"] }}>→</div>
              <div style={{ display: "flex", color: c["text-secondary"] }}>{rs}</div>
            </div>
          ))}
        </div>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
