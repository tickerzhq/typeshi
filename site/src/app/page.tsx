import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import Doors from "@/components/Doors";
import Footer from "@/components/Footer";
import Playground from "@/components/Playground";
import content from "@/generated/content.json";
import type { EditorWords, Example, Exploit } from "@/lib/types";
import s from "./page.module.css";

const INSTALL = "cargo install --git https://github.com/tickerzhq/typeshi";
const examples = content.examples as Example[];
const exploits = content.exploits as Exploit[];
const top = exploits[0];
// The escalation stops at its last line: the fifth failure and every one after it.
const STRIKES = ["1st", "2nd", "3rd", "4th", "5th+"];

export default function Home() {
  return (
    <>
      <section className={`wrap ${s.hero}`} aria-labelledby="hero-h">
        <h1 id="hero-h" className={s.h1}>
          lock in <code className={s.fn}>fn</code>.
        </h1>
        <p className={s.lede}>
          A language for code that moves money. Slang over Rust that compiles to real Solana programs (Anchor 1.2). The
          bugs behind ${content.exploitTotal.usdM}M of exploits don&apos;t compile. Neither does <code>rug!()</code>.
        </p>
        <div className={s.ctas}>
          <Link href="/tour" className="button">
            take the tour <span aria-hidden="true">→</span>
          </Link>
          <span className={s.ctaNote}>{content.tour.length} lessons, no install</span>
        </div>
      </section>

      <section className={`wrap ${s.stage}`} id="play" aria-labelledby="play-h">
        <h2 id="play-h" className="visually-hidden">
          try it: the real compiler
        </h2>
        <Playground examples={examples} words={content.editor as EditorWords} />
      </section>

      <section className={s.band} aria-labelledby="proof-h">
        <div className="wrap">
          <h2 id="proof-h" className={s.statement}>
            the bugs that drain programs don&apos;t compile. <span>everything else is plain Anchor.</span>
          </h2>

          <ul className={`grid ${s.proofs}`}>
            <li className={s.proof}>
              <h3 className={s.h3}>
                {top.name}&apos;s ${top.usdM}M bug doesn&apos;t compile.
              </h3>
              <figure className={s.term}>
                <figcaption>$ typeshi check</figcaption>
                <pre>
                  <span className={s.ngmi}>{top.rendered}</span>
                  <span className={s.verdictBad}>ngmi</span>
                </pre>
              </figure>
              <Link href="/exploits" className={s.more}>
                all {exploits.length} exploits, refused <span aria-hidden="true">→</span>
              </Link>
            </li>

            <li className={s.proof}>
              <h3 className={s.h3}>the rest is plain Anchor.</h3>
              <figure className={s.term}>
                <figcaption>gm_counter: lib.shi, then lib.rs</figcaption>
                <pre>
                  {content.phrasebook.map(([shi, rs]) => (
                    <span key={shi} className={s.pair}>
                      <span className={s.shi}>{shi}</span>
                      <span className={s.rs}>
                        <span aria-hidden="true">→ </span>
                        {rs}
                      </span>
                    </span>
                  ))}
                  <span className={s.verdictGood}>wagmi</span>
                </pre>
              </figure>
              <Link href="/keywords" className={s.more}>
                all {content.keywords.length} keywords <span aria-hidden="true">→</span>
              </Link>
            </li>

            <li className={s.proof}>
              <h3 className={s.h3}>fail twice and it gets personal.</h3>
              <figure className={s.term}>
                <figcaption>$ typeshi build, failing</figcaption>
                <ol className={s.strikes}>
                  {content.escalation.map((line, i) => (
                    <li key={line} data-strike={i + 1}>
                      <span className={s.strike}>{STRIKES[i]}</span>
                      {line}
                    </li>
                  ))}
                </ol>
              </figure>
              <a href={`/play#code=${content.bannedTry.rug}`} className={s.more}>
                fail on purpose <span aria-hidden="true">→</span>
              </a>
            </li>
          </ul>
        </div>
      </section>

      <section className={`wrap ${s.dyor}`} aria-labelledby="dyor-h">
        <h2 id="dyor-h" className={s.h2}>
          dyor.
        </h2>
        <Doors />
      </section>

      <section className={`wrap ${s.close}`} aria-labelledby="close-h">
        <h2 id="close-h" className={s.closeH}>
          still here? lock in.
        </h2>
        <div className={s.closeRow}>
          <Link href="/tour" className="button">
            take the tour <span aria-hidden="true">→</span>
          </Link>
          <div className={s.install}>
            <code className={s.cmd}>
              <span className={s.prompt} aria-hidden="true">
                $
              </span>{" "}
              {INSTALL}
            </code>
            <CopyButton text={INSTALL} className={s.copy} />
          </div>
        </div>
        <p className={s.then}>
          then <code>typeshi new gm_counter &amp;&amp; cd gm_counter &amp;&amp; typeshi check</code>
        </p>
      </section>

      <Footer />
    </>
  );
}
