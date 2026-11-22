import { ImageResponse } from "next/og";
import { Box, c, CodeLine, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";
import { decodeShared, verdict } from "@/lib/server-compile";

export const alt = "A shared typeshi program and what the compiler said about it.";
export const size = ogSize;
export const contentType = "image/png";

export default async function OG({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const src = decodeShared(code) ?? "// this link doesn't hold a program.";
  const v = verdict(src);
  const lines = src.split("\n");
  // The lines around the first error, or the top of the program.
  const from = v.line > 0 ? Math.max(0, Math.min(v.line - 4, lines.length - 8)) : 0;
  const shown = lines.slice(from, from + 8);
  const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()} eyebrow={v.program ? `${v.program}.shi` : "a typeshi program"}>
        <Box>
          {shown.map((l, i) => (
            <div key={i} style={{ display: "flex", gap: 22 }}>
              <div style={{ display: "flex", width: 40, justifyContent: "flex-end", fontSize: 22, color: from + i + 1 === v.line ? c["state-error"] : c["text-tertiary"] }}>
                {String(from + i + 1)}
              </div>
              <CodeLine text={clip(l, 60)} size={22} />
            </div>
          ))}
        </Box>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 600, marginTop: 26, color: v.ok ? c["accent-text"] : c["state-error"] }}>
          {clip(v.headline, 64)}
        </div>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
