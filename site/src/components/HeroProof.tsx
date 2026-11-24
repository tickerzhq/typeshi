"use client";

import { Tabs } from "@base-ui/react/tabs";

export type Proof = {
  /** The tab's name: one short word, so four fit across a phone. */
  tab: string;
  /** The line over the output, as a shell prompt or file name. */
  caption: string;
  /** The output's lines, each with a tone: an error, slang, the Rust it becomes, a verdict. */
  lines: { text: string; tone?: "err" | "shi" | "bad" | "good" | "warn" | "dim" }[];
};

const TONE: Record<NonNullable<Proof["lines"][number]["tone"]> | "plain", string> = {
  plain: "text-ink",
  err: "text-error",
  bad: "mt-2 font-bold text-error",
  good: "mt-2 font-bold text-brand-text",
  shi: "text-slang",
  warn: "text-warn",
  dim: "text-ink-3",
};

/**
 * The hero's proof, after typescriptlang.org's hero (an editor with "Editor Checks, Auto-complete, Interfaces, JSX"
 * along its top): one terminal card, a tab for each thing the compiler does, every line printed by the real compiler
 * when the site was built. Base UI's Tabs: arrow keys move between tabs, each tab names its panel, and the line under
 * the chosen tab slides to the next one (300ms, ease out expo, as tickerz.com's reveals; none for reduced motion).
 */
export default function HeroProof({ proofs }: { proofs: Proof[] }) {
  return (
    <Tabs.Root defaultValue={0} className="min-w-0 overflow-hidden rounded-card border border-line-strong bg-terminal">
      <Tabs.List
        aria-label="what the compiler does"
        activateOnFocus
        data-proof=""
        className="relative flex overflow-x-auto border-b border-line bg-raised px-1 [scrollbar-width:none]"
      >
        {proofs.map((p, i) => (
          <Tabs.Tab
            key={p.tab}
            value={i}
            className="h-11 shrink-0 cursor-pointer whitespace-nowrap border-0 bg-transparent px-3 text-small font-medium text-ink-2 transition-colors hover:text-ink data-[selected]:text-ink"
          >
            {p.tab}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute bottom-0 left-(--active-tab-left) h-px w-(--active-tab-width) bg-ink transition-[left,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none" />
      </Tabs.List>
      {proofs.map((p, i) => (
        <Tabs.Panel key={p.tab} value={i} keepMounted className="min-h-72 p-4 outline-none focus-visible:outline-2 sm:p-5">
          <p className="m-0 mb-3 font-mono text-label text-ink-3">{p.caption}</p>
          <pre className="m-0 whitespace-pre-wrap font-mono text-code leading-relaxed [overflow-wrap:anywhere]">
            {p.lines.map((l, j) => (
              <span key={j} className={`block ${TONE[l.tone ?? "plain"]}`}>
                {l.text}
              </span>
            ))}
          </pre>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
