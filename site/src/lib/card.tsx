import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import content from "@/generated/content.json";
import { colors } from "@/lib/tokens";

// The share card every page gets: 1200 x 630, rendered at build time by next/og (Satori and resvg), one
// template like Linear's and Bun's (research in the PR). The mark and the wordmark, where you are, the page's
// title big in Geist, light as Tickerz sets it, and real compiler output in a terminal on the ground.
// Every color is a token; every line in the terminal comes from content.json, which scripts/sync.mjs fills
// from the real compiler.

export const CARD = { width: 1200, height: 630 } as const;

const c = colors.dark;
const PAD = 64;

// Satori reads TrueType or WOFF, not the site's variable WOFF2, so these are static instances of the
// same two fonts (src/fonts/static), cut from the WOFF2 files the site serves with fontTools:
//   fonttools varLib.instancer src/fonts/Geist-Latin.woff2 wght=700 --remove-overlaps --flavor woff -o Geist-700.woff
const font = (file: string) => readFile(join(process.cwd(), "src/fonts/static", file));
const fonts = Promise.all([
  font("Geist-400.woff").then((data) => ({ name: "Geist", data, weight: 400 as const })),
  font("Geist-700.woff").then((data) => ({ name: "Geist", data, weight: 700 as const })),
  font("GeistMono-400.woff").then((data) => ({ name: "Geist Mono", data, weight: 400 as const })),
  font("GeistMono-700.woff").then((data) => ({ name: "Geist Mono", data, weight: 700 as const })),
]);

const MONO = "Geist Mono";
const SANS = "Geist";

/** A line in the card's terminal: a gutter (line numbers, rustc's bars) in the quiet color, then the text,
 * colored by its job, as on the site. */
export type Tone = "error" | "warning" | "muted" | "code" | "slang";
export type Line = { gutter?: string; text: string | { text: string; tone?: Tone }[]; tone?: Tone };
const plain = (l: Line) => (typeof l.text === "string" ? l.text : l.text.map((p) => p.text).join(""));
export type Terminal = { caption: string; lines: Line[]; verdict?: "wagmi" | "ngmi"; size?: number };

const TONE: Record<Tone, string> = {
  slang: c["syntax-slang"],
  error: c["state-error"],
  warning: c["state-warning"],
  muted: c["text-tertiary"],
  code: c["text-primary"],
};

/** The header's mark: fn on a brand-teal tile, the corner 1/6 of the side (DESIGN.md, "The mark"). */
function Mark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 50,
          height: 50,
          borderRadius: 8,
          background: c["accent-fill"],
          color: c["text-on-accent"],
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 25,
          letterSpacing: "-0.04em",
        }}
      >
        fn
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, letterSpacing: "-0.02em", color: c["text-primary"] }}>typeshi</span>
        <span style={{ fontFamily: MONO, fontSize: 20, color: c["text-tertiary"] }}>v{content.version}</span>
      </div>
    </div>
  );
}

/** The longest line decides the code size, so real output never gets cut: 26 px, down to 17 for long lines. */
function codeSize(t: Terminal) {
  if (t.size) return t.size;
  const inner = CARD.width - 2 * PAD - 2 * 30;
  const longest = Math.max(...t.lines.map((l) => (l.gutter ?? "").length + plain(l).length));
  return Math.max(17, Math.min(26, Math.floor(inner / (longest * 0.6))));
}

function TerminalBox({ t }: { t: Terminal }) {
  const size = codeSize(t);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: c["surface-terminal"],
        border: `1px solid ${c["border-strong"]}`,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "11px 30px",
          borderBottom: `1px solid ${c["border-default"]}`,
          fontFamily: MONO,
          fontSize: 20,
          color: c["text-tertiary"],
        }}
      >
        <span>{t.caption}</span>
        {t.verdict ? (
          <span style={{ fontWeight: 700, fontSize: 22, color: t.verdict === "wagmi" ? c["accent-text"] : c["state-error"] }}>
            {t.verdict}
          </span>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "16px 30px 18px", fontFamily: MONO, fontSize: size, lineHeight: 1.4 }}>
        {t.lines.map((l, i) => (
          <div key={i} style={{ display: "flex", whiteSpace: "pre", color: TONE[l.tone ?? "code"] }}>
            {l.gutter ? <span style={{ color: c["text-tertiary"] }}>{l.gutter}</span> : null}
            {typeof l.text === "string" ? (
              <span>{l.text}</span>
            ) : (
              l.text.map((p, j) => (
                <span key={j} style={{ color: TONE[p.tone ?? l.tone ?? "code"] }}>
                  {p.text}
                </span>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type CardProps = {
  /** The page's path, shown top right: where the link goes. None on the home. */
  path?: string;
  /** Where you are, above the title: "tour · basics · lesson 2 of 25". */
  kicker?: string;
  /** The page's title. Strings are set in Geist; pass nodes for the home's `fn`. */
  title: React.ReactNode;
  /** How long the title is, in characters, when it isn't a string. */
  titleLength?: number;
  /** The title's size in px, when the length rule isn't right. */
  titleSize?: number;
  lede?: string;
  terminal: Terminal;
};

/** The title's size: big when it's short, never more than two lines. */
function titleSize(len: number) {
  if (len <= 11) return 136;
  if (len <= 16) return 112;
  if (len <= 22) return 96;
  if (len <= 30) return 80;
  return 68;
}

export async function card({ path, kicker, title, titleLength, titleSize: fixed, lede, terminal }: CardProps) {
  const len = titleLength ?? (typeof title === "string" ? title.length : 12);
  const size = fixed ?? titleSize(len);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: `52px ${PAD}px ${PAD - 8}px`,
          background: c["surface-page"],
          color: c["text-primary"],
          fontFamily: SANS,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <Mark />
          {path ? <div style={{ fontFamily: MONO, fontSize: 24, color: c["text-tertiary"] }}>{path}</div> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: "auto", marginBottom: 36 }}>
          {kicker ? <div style={{ fontSize: 28, color: c["text-secondary"], letterSpacing: "-0.01em" }}>{kicker}</div> : null}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              fontWeight: 400,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: "-0.03em",
              maxWidth: CARD.width - 2 * PAD,
            }}
          >
            {title}
          </div>
          {lede ? (
            <div style={{ fontSize: 29, lineHeight: 1.3, color: c["text-secondary"], maxWidth: 1000, marginTop: 4 }}>{lede}</div>
          ) : null}
        </div>
        <TerminalBox t={terminal} />
      </div>
    ),
    { ...CARD, fonts: await fonts },
  );
}

/** Lines of typeshi beside the lines of Rust the compiler writes for them, the arrows in one column,
 * colored as on the home: the slang in its editor color, the Rust plain. */
export function pairLines(pairs: string[][]): Line[] {
  const w = Math.max(...pairs.map(([shi]) => shi.length));
  return pairs.map(([shi, rs]) => ({
    text: [{ text: shi.padEnd(w), tone: "slang" }, { text: "  →  ", tone: "muted" }, { text: rs }],
  }));
}

/** The home's headline: lock in, then fn as code in the brand teal, as in the hero. */
export function LockInFn() {
  return (
    <>
      <span>lock in&nbsp;</span>
      <span style={{ fontFamily: MONO, color: c["accent-text"], letterSpacing: "-0.06em" }}>fn</span>
      <span>.</span>
    </>
  );
}

/** A rustc-style diagnostic as the compiler rendered it: the gutter quiet, the message and the carets in
 * the error or warning color, the code itself plain. */
export function diagLines(rendered: string): Line[] {
  const lines = rendered.trimEnd().split("\n");
  const tone = lines[0].startsWith("warning") ? "warning" : "error";
  return lines.map((line, i) => {
    if (i === 0) return { text: line, tone };
    const arrow = line.match(/^(\s*-->)(.*)$/);
    if (arrow) return { gutter: arrow[1], text: arrow[2], tone: "muted" };
    const bar = line.match(/^(\s*\d*\s*\|)(.*)$/);
    if (!bar) return { text: line, tone: "code" };
    return { gutter: bar[1], text: bar[2], tone: /^\s*\^/.test(bar[2]) ? tone : "code" };
  });
}
