"use client";

import { useRef, useState } from "react";
import s from "./HeroProof.module.css";

export type Proof = {
  /** The tab's name. */
  tab: string;
  /** The line over the terminal, as a shell prompt or file name. */
  caption: string;
  /** The terminal's lines, each with a tone: an error, slang, the Rust it becomes, a verdict. */
  lines: { text: string; tone?: "err" | "shi" | "rs" | "bad" | "good" | "warn" | "dim" }[];
};

/**
 * The hero's proof, after typescriptlang.org's hero: one code card with tabs along its top, each tab a different
 * thing the compiler does, every line of it printed by the real compiler when the site was built. Arrow keys move
 * between tabs (WAI-ARIA tabs pattern).
 */
export default function HeroProof({ proofs }: { proofs: Proof[] }) {
  const [at, setAt] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const go = (i: number) => {
    const n = (i + proofs.length) % proofs.length;
    setAt(n);
    tabs.current[n]?.focus();
  };
  return (
    <div className={s.card}>
      <div role="tablist" aria-label="what the compiler does" className={s.tabs}>
        {proofs.map((p, i) => (
          <button
            key={p.tab}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`proof-tab-${i}`}
            aria-controls={`proof-${i}`}
            aria-selected={at === i}
            tabIndex={at === i ? 0 : -1}
            className={s.tab}
            onClick={() => setAt(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(i + 1);
              if (e.key === "ArrowLeft") go(i - 1);
            }}
          >
            {p.tab}
          </button>
        ))}
      </div>
      {proofs.map((p, i) => (
        <div
          key={p.tab}
          role="tabpanel"
          id={`proof-${i}`}
          aria-labelledby={`proof-tab-${i}`}
          hidden={at !== i}
          className={s.panel}
          tabIndex={0}
        >
          <p className={s.caption}>{p.caption}</p>
          <pre className={s.pre}>
            {p.lines.map((l, j) => (
              <span key={j} data-tone={l.tone}>
                {l.text}
              </span>
            ))}
          </pre>
        </div>
      ))}
    </div>
  );
}
