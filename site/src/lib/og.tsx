// Shared pieces for every share card (og:image, also used by X): the tokens' dark colors, Geist Mono,
// the `fn` tile, and one frame. Every div sets display: flex, as Satori requires.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteUrl } from "./site";
import { colors } from "./tokens";

export const ogSize = { width: 1200, height: 630 };
export const c = colors.dark;

export async function ogFonts() {
  const dir = join(process.cwd(), "node_modules", "geist", "dist", "fonts", "geist-mono");
  const [regular, semi, bold] = await Promise.all(
    ["Regular", "SemiBold", "Bold"].map((w) => readFile(join(dir, `GeistMono-${w}.ttf`))),
  );
  return [
    { name: "Geist Mono", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist Mono", data: semi, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** The favicon's tile (src/app/icon.svg, from scripts/tokens.mjs) as an image source. */
export async function tileSrc() {
  const svg = await readFile(join(process.cwd(), "src", "app", "icon.svg"));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export function Frame({ tile, eyebrow, path = "", children }: { tile: string; eyebrow?: string; path?: string; children: React.ReactNode }) {
  const host = siteUrl().replace(/^https?:\/\//, "");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: c["surface-page"],
        color: c["text-primary"],
        fontFamily: "Geist Mono",
        padding: "56px 72px 48px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tile} width={60} height={60} alt="" />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>typeshi</div>
        </div>
        {eyebrow ? <div style={{ display: "flex", fontSize: 24, color: c["accent-text"] }}>{eyebrow}</div> : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: c["text-tertiary"] }}>
        <div style={{ display: "flex" }}>{`${host}${path}`}</div>
        <div style={{ display: "flex" }}>lock in fn.</div>
      </div>
    </div>
  );
}

const SLANG =
  /(\b(?:stealth_launch|frame|cap_table|lock_in|ape|few_understand|bull|bear|mogs|gm|were_so_back|number_go_up|aura_farm|trust_me_bro|per_my_last_email|mark_to_market|probably_nothing|its_so_over|rekt|deadass|alpha_leak|cope|full_send|printer_go_brrr)\b!?)/g;

/** One line of code. typeshi's own words in lime; `plain` for Rust. */
export function CodeLine({ text, size = 24, color = c["text-primary"], plain = false }: { text: string; size?: number; color?: string; plain?: boolean }) {
  const base = { display: "flex", fontSize: size, color, whiteSpace: "pre" as const, lineHeight: 1.5 };
  if (plain) return <div style={base}>{text || " "}</div>;
  const parts = (text || " ").split(SLANG);
  return (
    <div style={base}>
      {parts.map((p, i) => (
        <span key={i} style={{ color: i % 2 === 1 ? c["syntax-slang"] : color, whiteSpace: "pre" }}>
          {p}
        </span>
      ))}
    </div>
  );
}

export function Box({ children, gap = 0 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
        background: c["surface-sunk"],
        border: `2px solid ${c["border-default"]}`,
        borderRadius: 14,
        padding: "18px 26px",
      }}
    >
      {children}
    </div>
  );
}
