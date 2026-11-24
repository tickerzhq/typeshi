import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Inline from "@/components/Inline";
import PageHead from "@/components/PageHead";
import content from "@/generated/content.json";
import { pageMeta } from "@/lib/meta";
import type { Example } from "@/lib/types";
import s from "./opinions.module.css";
import { wbr } from "@/lib/wbr";

export const metadata: Metadata = pageMeta({
  path: "/opinions",
  title: "opinions",
  description:
    "The compiler has opinions: banned moves that don't compile, six error codes that never change, and what typeshi build says when you fail again.",
});

const examples = content.examples as Example[];
const showcase = ["no_disclaimer", "edit_a_print", "warnings"].map((id) => examples.find((e) => e.id === id)!);

export default function OpinionsPage() {
  return (
    <>
      <div className="wrap">
        <PageHead title="the compiler has opinions.">
          Banned moves don&apos;t compile. Each one is a real error at a real line.
        </PageHead>

        <section aria-labelledby="banned-h">
          <h2 id="banned-h" className={s.h2}>
            banned moves <span className={s.count}>{content.banned.length}</span>
          </h2>
          <ul className={s.banned}>
            {content.banned.map(([name, why]) => (
              <li key={name}>
                <code className={s.move}>{wbr(name)}!</code>
                <span className={s.why}>{why}</span>
                <a className={s.try} href={`/play#code=${content.bannedTry[name as keyof typeof content.bannedTry]}`}>
                  try it<span className="visually-hidden">: {name}!</span> <span aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.section} aria-labelledby="says-h">
          <h2 id="says-h" className={s.h2}>
            what it says
          </h2>
          <p className={s.sub}>Three programs from the repo, and what the compiler prints for each.</p>
          <div className={`stack ${s.terms}`}>
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
        </section>

        <div className={`grid ${s.section} ${s.split}`}>
          <section aria-labelledby="escalate-h">
            <h2 id="escalate-h" className={s.h2}>
              fail again and it escalates
            </h2>
            <ol className={s.escalate}>
              {content.escalation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </section>
          <section aria-labelledby="codes-h">
            <h2 id="codes-h" className={s.h2}>
              codes 0x1 to 0x6, forever
            </h2>
            <p className={s.sub}>
              Every program gets <code>enum Cope</code>, and these six are the same in all of them.
            </p>
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
          </section>
        </div>

        <section className={s.section} aria-labelledby="confess-h">
          <h2 id="confess-h" className={s.h2}>
            confessions
          </h2>
          <p className={s.prose}>
            <Inline text={content.confessions} />
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
}
