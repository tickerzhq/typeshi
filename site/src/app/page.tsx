import CopyButton from "@/components/CopyButton";
import Inline from "@/components/Inline";
import Keywords from "@/components/Keywords";
import Playground from "@/components/Playground";
import content from "@/generated/content.json";
import type { EditorWords, Example } from "@/lib/types";
import s from "./page.module.css";

const INSTALL = "cargo install --git https://github.com/tickerzhq/typeshi";
const examples = content.examples as Example[];
const showcase = ["no_disclaimer", "edit_a_print", "warnings"].map((id) => examples.find((e) => e.id === id)!);

export default function Home() {
  return (
    <>
      <section className={`wrap ${s.hero}`}>
        <p className={s.eyebrow}>a joke language that really works</p>
        <h1 className={s.h1}>lock in fn.</h1>
        <p className={s.lede}>
          Slang over Rust that compiles to real Solana programs (Anchor 1.2). <code>rug!()</code> is a compile error.
          The compiler roasts you. The Rust it writes is ordinary Anchor you can read and audit.
        </p>
        <div className={s.install}>
          <code className={s.cmd}>
            <span className={s.prompt} aria-hidden>
              $
            </span>{" "}
            {INSTALL}
          </code>
          <CopyButton text={INSTALL} className={s.copy} />
        </div>
        <p className={s.small}>
          then <code>typeshi new gm_counter &amp;&amp; cd gm_counter &amp;&amp; typeshi check</code>. or skip the
          install and write some below.
        </p>
      </section>

      <section className={`wrap ${s.play}`} id="play" aria-labelledby="play-h">
        <h2 id="play-h" className="visually-hidden">
          try it
        </h2>
        <Playground examples={examples} words={content.editor as EditorWords} />
        <ul className={s.proof}>
          <li>
            <b>the real compiler.</b> the same Rust crate as the CLI, compiled to WebAssembly. for{" "}
            <code>degen_desk</code> it writes the committed <code>lib.rs</code> byte for byte.
          </li>
          <li>
            <b>nothing leaves your browser.</b> no server compiles anything. share links carry the code in the URL.
          </li>
          <li>
            <b>try a banned move.</b> type <code>rug!(counter);</code> inside <code>gm</code> and watch it refuse.
          </li>
        </ul>
      </section>

      <section className={`wrap ${s.section}`} id="opinions" aria-labelledby="opinions-h">
        <h2 id="opinions-h" className={s.h2}>
          the compiler has opinions
        </h2>
        <p className={s.sub}>Banned moves don&apos;t compile. Each one is a real error with a real line number.</p>
        <ul className={s.banned}>
          {content.banned.map(([name, why]) => (
            <li key={name}>
              <code className={s.move}>{name}!</code>
              <span>{why}</span>
            </li>
          ))}
        </ul>

        <div className={s.terms}>
          {showcase.map((ex) => (
            <figure key={ex.id} className={s.term}>
              <figcaption>
                <span>{ex.title}</span>
                <span className={s.muted}>{ex.path}</span>
              </figcaption>
              <pre>
                {ex.diags.map((d, i) => (
                  <span key={i} className={d.severity === "error" ? s.err : s.warn}>
                    {d.rendered}
                  </span>
                ))}
                <span className={ex.ok ? s.good : s.bad}>{ex.ok ? "wagmi" : "ngmi"}</span>
              </pre>
            </figure>
          ))}
        </div>

        <div className={s.split}>
          <div>
            <h3 className={s.h3}>fail again and it escalates</h3>
            <ol className={s.escalate}>
              {content.escalation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className={s.h3}>codes 0x1 to 0x6, forever</h3>
            <table className={s.codes}>
              <caption className="visually-hidden">the six fixed error codes in every typeshi program</caption>
              <tbody>
                {content.fixedErrors.map(([name, msg], i) => (
                  <tr key={name}>
                    <th scope="row" className="num">
                      0x{i + 1}
                    </th>
                    <td>
                      <code>{name}</code>
                    </td>
                    <td>{msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className={s.prose}>
          <Inline text={content.confessions} />
        </p>
      </section>

      <section className={`wrap ${s.section}`} id="keywords" aria-labelledby="keywords-h">
        <h2 id="keywords-h" className={s.h2}>
          keywords
        </h2>
        <p className={s.sub}>Every word, and the Rust or Anchor it becomes. Straight from the README.</p>
        <Keywords rows={content.keywords} />
      </section>

      <section className={`wrap ${s.section}`} aria-labelledby="how-h">
        <h2 id="how-h" className={s.h2}>
          how it works
        </h2>
        <ol className={s.steps}>
          <li>
            <b>tokens, not regex.</b> typeshi reads <code>.shi</code> as Rust tokens with real line and column
            numbers, then rewrites the slang into plain Anchor.
          </li>
          <li>
            <b>printed like a human wrote it.</b> the result is parsed with <code>syn</code> and printed with{" "}
            <code>prettyplease</code>. <code>typeshi build</code> then runs <code>anchor build</code>.
          </li>
          <li>
            <b>errors find their way home.</b> every token remembers where it came from, so when rustc complains about
            the generated <code>.rs</code>, typeshi points at the line you wrote.
          </li>
        </ol>
        <p className={s.prose}>
          For code that holds money on a public chain, that last part matters: the code that runs is the code you can
          see. Read the generated Rust before you deploy anything. The confession macros really do what they say.
        </p>
      </section>

      <footer className={`wrap ${s.footer}`}>
        <p>
          MIT. A parody of the name TypeScript, not affiliated with Microsoft. Nothing here is financial advice. Made by{" "}
          <a href="https://tickerz.com">Tickerz</a>. <a href="https://github.com/tickerzhq/typeshi">Source on GitHub</a>.
        </p>
        <p className={s.muted}>wen moon? soon™</p>
      </footer>
    </>
  );
}
