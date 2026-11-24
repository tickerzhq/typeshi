import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import Footer from "@/components/Footer";
import HeroProof, { type Proof } from "@/components/HeroProof";
import Icon from "@/components/Icon";
import Playground from "@/components/Playground";
import SecHead, { Arrow } from "@/components/SecHead";
import content from "@/generated/content.json";
import { PAGES } from "@/lib/pages";
import type { EditorWords, Example, Exploit } from "@/lib/types";
import s from "./page.module.css";

const INSTALL = "cargo install --git https://github.com/tickerzhq/typeshi";
const CHECKS = "https://github.com/tickerzhq/typeshi/blob/main/docs/checks";
const examples = content.examples as Example[];
const exploits = content.exploits as Exploit[];
const total = content.exploitTotal;
const checks = Object.entries(content.checkTitles as Record<string, string>);
const icon = (href: string) => PAGES.find((p) => p.href === href)!.icon;
// The first exploit refused for mixing money units, for the units tab and pillar.
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
  { tab: "Exploits", caption: `${exploits[0].name}, ${exploits[0].amount}: $ typeshi check`, lines: refused(exploits[0]) },
  { tab: "Money units", caption: `${units.name}, ${units.amount}: $ typeshi check`, lines: refused(units) },
  {
    tab: "Plain Anchor",
    caption: "gm_counter: lib.shi, then lib.rs",
    lines: [
      ...content.phrasebook.flatMap(([shi, rs]) => [
        { text: shi, tone: "shi" as const },
        { text: `→ ${rs}` },
      ]),
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

// Four reasons, one line each, after rust-lang.org's "Why Rust?" and typescriptlang.org's three columns.
const PILLARS = [
  {
    title: "Exploits don't compile",
    line: `${exploits.length} real exploits, about $${total.usdM}M, rewritten. Every one is refused.`,
    href: "/exploits",
    more: "See the exploits",
    icon: icon("/exploits"),
  },
  {
    title: "Money has units",
    line: `USDC plus lamports is a compile error, not a ${units.amount} bug.`,
    href: `/exploits#${units.id}`,
    more: `See ${units.name}`,
    icon: [
      "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",
      "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",
      "M7 21h10",
      "M12 3v18",
      "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",
    ],
  },
  {
    title: "Plain Anchor out",
    line: `${content.keywords.length} words, each one the Rust you would have written.`,
    href: "/keywords",
    more: "See the keywords",
    icon: icon("/keywords"),
  },
  {
    title: "It has opinions",
    line: `${content.banned.length} banned moves. Fail twice and it gets personal.`,
    href: `/play#code=${content.bannedTry.rug}`,
    more: "Fail on purpose",
    icon: icon("/opinions"),
  },
];

/**
 * The home, on tickerz.com's system and the best language sites' order: the claim and the install on the left, the
 * compiler's proof on the right, four reasons, then the compiler itself and sections of cards and rows that lead to
 * their pages. DESIGN.md, "Structure".
 */
export default function Home() {
  return (
    <>
      <section className={`wrap ${s.hero}`} aria-labelledby="hero-h">
        <div className={s.claim}>
          <h1 id="hero-h" className={s.h1}>
            lock in <code className={s.fn}>fn</code>.
          </h1>
          <p className={s.lede}>
            Slang over Rust for Solana programs. The bugs behind ${total.usdM}M of exploits don&apos;t compile.
          </p>
          <div className={s.install}>
            <code className={s.cmd}>
              <span className={s.prompt} aria-hidden="true">
                $
              </span>
              {INSTALL}
            </code>
            <CopyButton text={INSTALL} className={s.copy} />
          </div>
          <div className={s.actions}>
            <Link href="/tour" className="button">
              Take the tour <span aria-hidden="true">→</span>
            </Link>
            <a href="#play" className="button" data-quiet="">
              Try it here
            </a>
          </div>
        </div>
        <div className={s.proof}>
          <HeroProof proofs={proofs} />
        </div>
      </section>

      <section className="wrap sec" aria-labelledby="why-h">
        <SecHead id="why-h">Why typeshi</SecHead>
        <ul className={s.pillars}>
          {PILLARS.map((p) => (
            <li key={p.title}>
              <span className={s.tile}>
                <Icon d={p.icon} />
              </span>
              <h3 className={s.pillarH}>{p.title}</h3>
              <p className={s.pillarP}>{p.line}</p>
              <a href={p.href} className={s.more}>
                {p.more} <span aria-hidden="true">→</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap sec" id="play" aria-labelledby="play-h">
        <SecHead id="play-h" href="/play" sub="The real compiler, built to WebAssembly. Edit, then build.">
          Playground
        </SecHead>
        <div className={s.stage}>
          <Playground examples={examples} words={content.editor as EditorWords} />
        </div>
      </section>

      <section className="wrap sec" aria-labelledby="exploits-h">
        <SecHead
          id="exploits-h"
          href="/exploits"
          sub={`$${total.usdM}M and ${total.sol.toLocaleString("en-US")} SOL of real losses. None of them compile.`}
        >
          Exploits
        </SecHead>
        <ul className="cards">
          {exploits.map((e) => (
            <li key={e.id}>
              <Link href={`/exploits#${e.id}`} className={`card ${s.exploit}`}>
                <span className={s.top}>
                  <span className={s.code}>{e.check}</span>
                  <span>{e.date.slice(0, 4)}</span>
                </span>
                <span className={s.name}>{e.name}</span>
                <span className={s.amount}>{e.amount}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap sec" aria-labelledby="checks-h">
        <SecHead id="checks-h" href={CHECKS.replace("/blob/", "/tree/")} sub="What each catches, the fix, and what it misses.">
          The checks
        </SecHead>
        <ul className="rows">
          {checks.map(([code, title]) => (
            <li key={code}>
              <a href={`${CHECKS}/${code}.md`} className="row">
                <span className={`row-text ${s.check}`}>
                  <code>{code}</code>
                  <span>{cap(title)}</span>
                </span>
                <span className="row-go">
                  <Arrow />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="wrap sec" aria-labelledby="tour-h">
        <SecHead id="tour-h" href="/tour" sub={`${content.tour.length} lessons. Each starts broken; you fix it here.`}>
          Tour
        </SecHead>
        <ul className="rows">
          {chapters.map((c) => (
            <li key={c.name}>
              <Link href={`/tour/${c.first.slug}`} className="row">
                <span className="row-text">
                  <span className={s.chapter}>{c.name}</span>
                  <small>
                    {c.n} {c.n === 1 ? "lesson" : "lessons"}
                  </small>
                </span>
                <span className="row-go">
                  <Arrow />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
    </>
  );
}
