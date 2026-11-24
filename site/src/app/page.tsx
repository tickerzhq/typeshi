import Link from "next/link";
import { ArrowRight, Ban, Code, Scale, ShieldX, type LucideIcon } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import Footer from "@/components/Footer";
import HeroProof, { type Proof } from "@/components/HeroProof";
import Playground from "@/components/Playground";
import Section, { Arrow } from "@/components/SecHead";
import content from "@/generated/content.json";
import type { EditorWords, Example, Exploit } from "@/lib/types";

const INSTALL = "cargo install --git https://github.com/tickerzhq/typeshi";
const CHECKS = "https://github.com/tickerzhq/typeshi/blob/main/docs/checks";
const examples = content.examples as Example[];
const exploits = content.exploits as Exploit[];
const total = content.exploitTotal;
const checks = Object.entries(content.checkTitles as Record<string, string>);
// The first exploit refused for mixing money units, for the units tab and reason.
const units = exploits.find((e) => e.check === "SHI002")!;
const STRIKES = ["1st", "2nd", "3rd", "4th", "5th+"];
const cap = (t: string) => t[0].toUpperCase() + t.slice(1);
const chapters = [...new Set(content.tour.map((l) => l.chapter))].map((name) => {
  const lessons = content.tour.filter((l) => l.chapter === name);
  return { name: cap(name), first: lessons[0], n: lessons.length };
});

// Every line in the hero's card is the compiler's own output, written into content.json at build time.
const refused = (e: Exploit): Proof["lines"] => [
  ...e.rendered.split("\n").map((text, i) => ({ text, tone: i === 0 ? ("err" as const) : ("dim" as const) })),
  { text: "ngmi", tone: "bad" },
];
const proofs: Proof[] = [
  { tab: "Exploits", caption: `${exploits[0].name}, ${exploits[0].amount} · $ typeshi check`, lines: refused(exploits[0]) },
  { tab: "Units", caption: `${units.name}, ${units.amount} · $ typeshi check`, lines: refused(units) },
  {
    tab: "Anchor",
    caption: "gm_counter · lib.shi, then lib.rs",
    lines: [
      ...content.phrasebook.flatMap(([shi, rs]) => [{ text: shi, tone: "shi" as const }, { text: `→ ${rs}` }]),
      { text: "wagmi", tone: "good" },
    ],
  },
  {
    tab: "Opinions",
    caption: "$ typeshi build, failing in a row",
    lines: content.escalation.map((text, i) => ({
      text: `${STRIKES[i].padEnd(5)}${text}`,
      tone: i < 4 ? ("warn" as const) : ("err" as const),
    })),
  },
];

// Four reasons, one line each, after rust-lang.org's "Why Rust?" and typescriptlang.org's columns.
const REASONS: { title: string; line: string; href: string; more: string; icon: LucideIcon }[] = [
  {
    title: "Exploits don't compile",
    line: `${exploits.length} real exploits, about $${total.usdM}M, rewritten. Every one is refused.`,
    href: "/exploits",
    more: "See the exploits",
    icon: ShieldX,
  },
  {
    title: "Money has units",
    line: `USDC plus lamports is a compile error, not a ${units.amount} bug.`,
    href: `/exploits#${units.id}`,
    more: `See ${units.name}`,
    icon: Scale,
  },
  {
    title: "Plain Anchor out",
    line: `${content.keywords.length} words, each one the Rust you would have written.`,
    href: "/keywords",
    more: "See the keywords",
    icon: Code,
  },
  {
    title: "It has opinions",
    line: `${content.banned.length} banned moves. Fail twice and it gets personal.`,
    href: `/play#code=${content.bannedTry.rug}`,
    more: "Fail on purpose",
    icon: Ban,
  },
];

const BUTTON = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2 text-center text-body font-medium no-underline transition-colors";
const MORE = "group mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-4 text-small font-medium text-ink no-underline md:min-h-9";
const ROW = "grid min-h-11 grid-cols-[minmax(0,1fr)_28px] items-center gap-4 py-5 text-ink no-underline transition-colors hover:bg-hover";
const GO = "grid size-7 place-items-center rounded-full border border-line-strong text-ink-2 transition-colors group-hover:text-ink";

/**
 * The home, on tickerz.com's system (its stack, grid and numbers: tk-home.css) in the order the best language sites use:
 * the claim and the install on the left and the compiler's proof on the right (typescriptlang.org, bun.sh), four reasons
 * (rust-lang.org), then the compiler and sections of cards and rows that lead to their pages. DESIGN.md, "Structure".
 */
export default function Home() {
  return (
    <>
      <section aria-labelledby="hero-h" className="frame grid-page gap-y-12 pt-10 lg:items-center lg:pt-22">
        <div className="col-span-full min-w-0 lg:col-span-6">
          <h1 id="hero-h" className="m-0 text-display font-normal leading-[1.02] tracking-[-0.03em]">
            lock in <code className="font-mono text-[0.94em] tracking-[-0.06em] text-brand-text">fn</code>.
          </h1>
          <p className="mb-0 mt-5 max-w-[26em] text-lede leading-[1.45] text-ink-2">
            Slang over Rust for Solana programs. The bugs behind ${total.usdM}M of exploits don&apos;t compile.
          </p>
          <div className="mt-8 flex h-12 max-w-[34rem] items-stretch overflow-hidden rounded-card border border-line-strong bg-sunk">
            <code className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap px-4 font-mono text-code [scrollbar-width:none]">
              <span aria-hidden="true" className="select-none text-ink-3">
                $
              </span>
              {INSTALL}
            </code>
            <CopyButton
              text={INSTALL}
              className="min-w-18 shrink-0 cursor-pointer border-0 border-l border-line-strong bg-raised px-3 text-small font-medium text-ink transition-colors hover:bg-hover"
            />
          </div>
          <div className="mt-4 grid gap-2 sm:flex">
            <Link href="/tour" className={`${BUTTON} bg-brand text-on-brand hover:bg-brand-hover`}>
              Take the tour <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
            <a href="#play" className={`${BUTTON} border border-line-strong text-ink hover:bg-hover`}>
              Try it here
            </a>
          </div>
        </div>
        <div className="col-span-full min-w-0 lg:col-span-6">
          <HeroProof proofs={proofs} />
        </div>
      </section>

      <Section id="why" title="Why typeshi">
        <ul className="m-0 grid list-none gap-x-4 gap-y-10 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r) => (
            <li key={r.title} className="flex min-w-0 flex-col">
              <span className="grid size-11 place-items-center rounded-control border border-line-strong bg-raised text-brand-text">
                <r.icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <h3 className="mb-0 mt-5 text-lede font-medium leading-tight">{r.title}</h3>
              <p className="mb-0 mt-2 text-body text-ink-2">{r.line}</p>
              <a href={r.href} className={MORE}>
                {r.more}
                <ArrowRight size={14} strokeWidth={2} aria-hidden="true" className="text-ink-3 transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-brand-text" />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="play" title="Playground" href="/play" sub="The real compiler, built to WebAssembly. Edit, then build.">
        <div className="relative isolate">
          <Playground examples={examples} words={content.editor as EditorWords} />
        </div>
      </Section>

      <Section
        id="exploits"
        title="Exploits"
        href="/exploits"
        sub={`$${total.usdM}M and ${total.sol.toLocaleString("en-US")} SOL of real losses. None of them compile.`}
      >
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(10rem,100%),1fr))] gap-3 p-0 md:gap-4 lg:grid-cols-4">
          {exploits.map((e) => (
            <li key={e.id} className="flex min-w-0">
              <Link
                href={`/exploits#${e.id}`}
                className="flex min-w-0 flex-1 flex-col rounded-card border border-line-strong bg-raised p-4 text-ink no-underline transition-colors hover:border-ink-3 lg:min-h-50"
              >
                <span className="flex flex-wrap justify-between gap-x-3 font-mono text-label tracking-wide text-ink-3">
                  <span className="text-error">{e.check}</span>
                  <span>{e.date.slice(0, 4)}</span>
                </span>
                <span className="mt-2 text-body font-medium leading-snug sm:text-lede">{e.name}</span>
                <span className="mt-auto pt-6 text-subhead font-normal leading-none tracking-[-0.02em] tabular-nums lg:pt-8 lg:text-section">
                  {e.amount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="checks" title="The checks" href={CHECKS.replace("/blob/", "/tree/")} sub="What each catches, the fix, and what it misses.">
        <ul className="m-0 list-none border-t border-line p-0">
          {checks.map(([code, title]) => (
            <li key={code} className="border-b border-line">
              <a href={`${CHECKS}/${code}.md`} className={`group ${ROW}`}>
                <span className="grid min-w-0 gap-1 sm:grid-cols-[8ch_minmax(0,1fr)] sm:items-baseline sm:gap-4">
                  <code className="font-mono text-small text-error">{code}</code>
                  <span className="text-lede leading-[1.3]">{cap(title)}</span>
                </span>
                <span className={GO}>
                  <Arrow className="size-3" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tour" title="Tour" href="/tour" sub={`${content.tour.length} lessons. Each starts broken; you fix it here.`}>
        <ul className="m-0 list-none border-t border-line p-0">
          {chapters.map((c) => (
            <li key={c.name} className="border-b border-line">
              <Link href={`/tour/${c.first.slug}`} className={`group ${ROW}`}>
                <span className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-4">
                  <span className="text-lede leading-[1.3]">{c.name}</span>
                  <span className="text-small text-ink-2">
                    {c.n} {c.n === 1 ? "lesson" : "lessons"}
                  </span>
                </span>
                <span className={GO}>
                  <Arrow className="size-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Footer />
    </>
  );
}
