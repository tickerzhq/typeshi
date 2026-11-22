import { ImageResponse } from "next/og";
import { Box, c, CodeLine, Frame, ogFonts, ogSize, tileSrc } from "@/lib/og";

export const alt = "The typeshi playground: write slang, get Anchor Rust, with the real compiler in your browser.";
export const size = ogSize;
export const contentType = "image/png";

const shi = ["lock_in fn gm(ctx) -> W {", "    number_go_up!(counter.gms);", "    were_so_back!()", "}"];
// What the compiler really writes for it, as prettyplease lays it out.
const rs = [
  "pub fn gm(ctx: Context<Gm>) -> Result<()> {",
  "    ctx.accounts.counter.gms = ctx",
  "        .accounts.counter.gms",
  "        .checked_add(1)",
  "        .ok_or(error!(Cope::…))?;",
  "    Ok(())",
  "}",
];

function Pane({ title, children, grow }: { title: string; children: React.ReactNode; grow: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: grow, background: c["surface-sunk"], border: `2px solid ${c["border-default"]}`, borderRadius: 14 }}>
      <div style={{ display: "flex", padding: "12px 20px", fontSize: 20, color: c["text-secondary"], borderBottom: `2px solid ${c["border-default"]}` }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

export default async function OG() {
  return new ImageResponse(
    (
      <Frame tile={await tileSrc()} eyebrow="playground" path="/play">
        <div style={{ display: "flex", fontSize: 47, fontWeight: 700, letterSpacing: -2, marginBottom: 28 }}>
          the real compiler, in your browser.
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "stretch" }}>
          <Pane title="lib.shi" grow={1}>
            {shi.map((l) => (
              <CodeLine key={l} text={l} size={19} />
            ))}
          </Pane>
          <div style={{ display: "flex", alignItems: "center", fontSize: 40, color: c["accent-text"] }}>→</div>
          <Pane title="lib.rs" grow={1.35}>
            {rs.map((l) => (
              <CodeLine key={l} text={l} size={19} color={c["text-secondary"]} plain />
            ))}
          </Pane>
        </div>
      </Frame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
