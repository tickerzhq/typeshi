import { ImageResponse } from "next/og";

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
          background: "#0b0b0d",
          color: "#ededed",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontSize: 30, color: "#b6f05a" }}>typeshi</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: -8, lineHeight: 1 }}>lock in fn.</div>
          <div style={{ fontSize: 34, color: "#a3a3ab", marginTop: 28 }}>
            slang over Rust that compiles to real Solana programs.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#ff6a6a" }}>
          error: not on our watch, anon · rug!() is a compile error
        </div>
      </div>
    ),
    size,
  );
}
