import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import Doors from "@/components/Doors";
import Footer from "@/components/Footer";
import Playground from "@/components/Playground";
import content from "@/generated/content.json";
import type { EditorWords, Example } from "@/lib/types";
import s from "./page.module.css";

const INSTALL = "cargo install --git https://github.com/tickerzhq/typeshi";
const examples = content.examples as Example[];
const rug = examples.find((e) => e.id === "rug")!;
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
          A joke language that really works. Slang over Rust that compiles to real Solana programs (Anchor 1.2), and{" "}
          <code>rug!()</code> is a compile error.
        </p>
        <div className={s.ctas}>
          <Link href="/tour" className="button">
            take the tour <span aria-hidden="true">→</span>
          </Link>
          <span className={s.ctaNote}>{content.tour.length} lessons in your browser. no install.</span>
        </div>
      </section>

      <section className={`wrap ${s.stage}`} id="play" aria-labelledby="play-h">
        <h2 id="play-h" className="visually-hidden">
          try it: the real compiler
        </h2>
        <Playground examples={examples} words={content.editor as EditorWords} />
        <ul className={s.facts}>
          <li>the same Rust crate as the CLI, compiled to WebAssembly.</li>
          <li>nothing leaves your browser.</li>
          <li>
            for <code>degen_desk</code> it writes the committed <code>lib.rs</code> byte for byte.
          </li>
        </ul>
      </section>

      <section className={s.band} aria-labelledby="proof-h">
        <div className="wrap">
          <h2 id="proof-h" className={s.statement}>
            every joke is a real compile error.{" "}
            <span>it points at your line, like rustc does. everything else is plain Anchor you can read.</span>
          </h2>

          <ul className={`grid ${s.proofs}`}>
            <li className={s.proof}>
              <h3 className={s.h3}>
                <code className={s.ngmi}>rug!()</code> doesn&apos;t compile.
              </h3>
              <p className={s.say}>
                {content.banned.length} moves are banned. each one is a compile error that points at your line.
              </p>
              <figure className={s.term}>
                <figcaption>$ typeshi check</figcaption>
                <pre>
                  {rug.diags.map((d, i) => (
                    <span key={i} className={s.ngmi}>
                      {d.rendered.trimEnd()}
                    </span>
                  ))}
                  <span className={s.verdictBad}>ngmi</span>
                </pre>
              </figure>
              <Link href="/opinions" className={s.more}>
                every banned move <span aria-hidden="true">→</span>
              </Link>
            </li>

            <li className={s.proof}>
              <h3 className={s.h3}>the rest is plain Anchor.</h3>
              <p className={s.say}>each word becomes the Rust you would have written, in a lib.rs next to your .shi.</p>
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
              <p className={s.say}>
                <code>typeshi build</code> counts the failures in a row. this is what it says each time.
              </p>
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
          dyor. <span>the rest of typeshi, one page each.</span>
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
