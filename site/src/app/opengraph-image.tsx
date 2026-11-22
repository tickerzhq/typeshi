import { ImageResponse } from "next/og";
import { Box, c, CodeLine, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";

export const alt = "typeshi: lock in fn. Slang over Rust that compiles to real Solana programs.";
export const size = ogSize;
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()}>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 700, letterSpacing: -9, lineHeight: 1 }}>
          <span>lock in&nbsp;</span>
          <span style={{ color: c["accent-text"] }}>fn</span>
          <span>.</span>
        </div>
        <div style={{ display: "flex", fontSize: 32, color: c["text-secondary"], marginTop: 22, marginBottom: 38 }}>
          slang over Rust that compiles to real Solana programs.
        </div>
        <Box>
          <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
            <CodeLine text="rug!(pool);" size={28} />
            <div style={{ display: "flex", fontSize: 28, color: c["state-error"] }}>error: not on our watch, anon</div>
          </div>
        </Box>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
