import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Keywords from "@/components/Keywords";
import PageHead from "@/components/PageHead";
import content from "@/generated/content.json";
import { pageMeta } from "@/lib/meta";
import s from "./keywords.module.css";

export const metadata: Metadata = pageMeta({
  path: "/keywords",
  title: "keywords",
  description: "Every typeshi keyword, and the Rust or Anchor it becomes. Plus how the compiler works.",
});

export default function KeywordsPage() {
  return (
    <>
      <div className="wrap">
        <PageHead title="keywords.">
          Every word, and the Rust or Anchor it becomes.
        </PageHead>
        <Keywords rows={content.keywords} />

        <section className={s.how} aria-labelledby="how-h">
          <h2 id="how-h" className={s.h2}>
            how it works
          </h2>
          <ol className={s.steps}>
            <li>
              <b>tokens, not regex.</b>
              <span>
                typeshi reads <code>.shi</code> as Rust tokens with real line and column numbers, then rewrites the
                slang into plain Anchor.
              </span>
            </li>
            <li>
              <b>printed like a human wrote it.</b>
              <span>
                the result is parsed with <code>syn</code> and printed with <code>prettyplease</code>.{" "}
                <code>typeshi build</code> then runs <code>anchor build</code>.
              </span>
            </li>
            <li>
              <b>errors find their way home.</b>
              <span>
                every token remembers where it came from, so when rustc complains about the generated{" "}
                <code>.rs</code>, typeshi points at the line you wrote.
              </span>
            </li>
          </ol>
          <p className={s.prose}>
            For code that holds money on a public chain, that last part matters: the code that runs is the code you
            can see. Read the generated Rust before you deploy anything. The confession macros really do what they
            say.
          </p>
        </section>
      </div>
      <Footer />
    </>
  );
}
