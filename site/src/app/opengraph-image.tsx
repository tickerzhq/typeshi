import { ImageResponse } from "next/og";
import { colors } from "@/lib/tokens";

const c = colors.dark;

export const alt = "typeshi: lock in fn. Slang over Rust that compiles to real Solana programs.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: c["surface-page"],
          color: c["text-primary"],
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 30, color: c["accent-text"] }}>typeshi</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>lock in fn.</div>
          <div style={{ fontSize: 34, color: c["text-secondary"], marginTop: 28 }}>
            slang over Rust that compiles to real Solana programs.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: c["state-error"] }}>
          error: not on our watch, anon · rug!() is a compile error
        </div>
      </div>
    ),
    size,
  );
}
