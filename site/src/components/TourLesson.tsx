"use client";

import { track } from "@vercel/analytics";
import type { EditorView } from "@codemirror/view";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { passes } from "@/lib/check.mjs";
import { compiler } from "@/lib/compiler";
import { SLIDE_KEY } from "@/lib/head";
import type { CompileResult, EditorWords } from "@/lib/types";
import type { Lesson } from "@/lib/types-tour";
import { wbr } from "@/lib/wbr";
import BootCode from "./BootCode";
import Prose from "./Prose";
import { useTabs } from "./Tabs";
import s from "./TourLesson.module.css";

type Editor = typeof import("./editor");
const VIEWS = ["term", "rs"] as const;
// Back and next are plain links, so moving between lessons is a cross-document navigation and the
// browser's own view transition slides the lesson text the way you went (see slideScript).
const slide = (dir: "nav-forward" | "nav-back") => () => {
  try {
    sessionStorage.setItem(SLIDE_KEY, dir);
  } catch {}
};

const DONE_KEY = "typeshi:tour:done";
const codeKey = (slug: string) => `typeshi:tour:code:${slug}`;

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {}
  },
};

export function doneSet(): Set<string> {
  try {
    return new Set(JSON.parse(store.get(DONE_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export default function TourLesson({
  lesson,
  prev,
  next,
  total,
  words,
}: {
  lesson: Lesson;
  prev: Pick<Lesson, "slug" | "title"> | null;
  next: Pick<Lesson, "slug" | "title"> | null;
  total: number;
  words: EditorWords;
}) {
  const srcEl = useRef<HTMLDivElement>(null);
  const outEl = useRef<HTMLDivElement>(null);
  const srcView = useRef<EditorView | null>(null);
  const outView = useRef<EditorView | null>(null);
  /** CodeMirror, loaded after the page is interactive so the lesson text paints first. */
  const cm = useRef<Editor | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [result, setResult] = useState<CompileResult | null>(null);
  const [passed, setPassed] = useState(false);
  const [view, setView] = useState<(typeof VIEWS)[number]>("term");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const tabs = useTabs(VIEWS, view, setView);

  const run = useCallback(
    async (src: string) => {
      const my = ++seq.current;
      let r: CompileResult;
      try {
        r = await compiler().compile(src, false);
      } catch (e) {
        if (my === seq.current) setError(`the compiler didn't load: ${String(e)}`);
        return;
      }
      if (my !== seq.current) return;
      setResult(r);
      const ed = cm.current;
      if (ed && srcView.current) ed.showDiagnostics(srcView.current, r.diags);
      if (ed && outView.current) {
        ed.replaceDoc(
          outView.current,
          r.ok ? r.rust : "// nothing here yet: lib.shi doesn't compile.\n// the terminal says why.\n",
        );
      }
      const ok = passes(r, lesson.check);
      setPassed(ok);
      if (ok) {
        const done = doneSet();
        if (!done.has(lesson.slug)) {
          done.add(lesson.slug);
          store.set(DONE_KEY, JSON.stringify([...done]));
          track("lesson_passed", { lesson: lesson.slug, n: lesson.n });
          if (done.size === total) track("tour_finished");
        }
      }
    },
    [lesson, total],
  );

  useEffect(() => {
    let cancelled = false;
    const saved = store.get(codeKey(lesson.slug));
    const doc = saved ?? lesson.start;
    // Start the compiler while CodeMirror downloads; neither waits for the other.
    void run(doc);
    (async () => {
      const ed = await import("./editor");
      if (cancelled || !srcEl.current || !outEl.current) return;
      cm.current = ed;
      srcView.current = ed.sourceEditor({
        parent: srcEl.current,
        doc,
        words,
        onChange: (d) => {
          store.set(codeKey(lesson.slug), d === lesson.start ? null : d);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void run(d), 110);
        },
        onBuild: () => void run(srcView.current?.state.doc.toString() ?? ""),
      });
      outView.current = ed.outputEditor(outEl.current);
      setReady(true);
      void run(doc); // again, now there is an editor to put the diagnostics on
    })();
    return () => {
      cancelled = true;
      setReady(false);
      if (timer.current) clearTimeout(timer.current);
      srcView.current?.destroy();
      outView.current?.destroy();
      srcView.current = outView.current = null;
    };
  }, [lesson, words, run]);

  const load = (code: string) => {
    if (!srcView.current || !cm.current) return;
    cm.current.replaceDoc(srcView.current, code);
    srcView.current.focus();
  };

  const errors = result?.diags.filter((d) => d.severity === "error").length ?? 0;
  const goal =
    lesson.check.kind === "error"
      ? "goal: get the compiler to refuse."
      : lesson.check.kind === "warning"
        ? "goal: it compiles, and the compiler warns you."
        : lesson.check.rust.length
        ? "goal: it compiles, and lib.rs shows the change."
        : "goal: it compiles.";

  return (
    <div className={s.layout}>
      <article className={s.text} aria-labelledby="lesson-title">
        <p className={s.count}>
          <Link href="/tour">tour</Link> · {lesson.chapter} · lesson {lesson.n} of {total}
        </p>
        <h1 id="lesson-title" className={s.title}>
          {wbr(lesson.title)}
        </h1>
        <Prose text={lesson.body} className={s.prose} />

        <div className={s.goal} data-passed={passed} role="status" aria-live="polite">
          {result == null ? (
            <span>loading the compiler…</span>
          ) : passed ? (
            <span>
              <b>done. wagmi.</b> {next ? "on to the next one." : "that's the whole tour."}
            </span>
          ) : (
            <span>{goal}</span>
          )}
        </div>

        <div className={s.actions}>
          <button type="button" className={s.btn} onClick={() => load(lesson.start)}>
            reset
          </button>
          <button
            type="button"
            className={s.btn}
            onClick={() => {
              track("solution_shown", { lesson: lesson.slug });
              load(lesson.solution);
            }}
          >
            show solution
          </button>
        </div>

        <nav className={s.pager} aria-label="lessons">
          {prev ? (
            <a href={`/tour/${prev.slug}`} className={s.prev} onClick={slide("nav-back")}>
              <span>← back</span>
              {wbr(prev.title)}
            </a>
          ) : (
            <span />
          )}
          {next ? (
            <a href={`/tour/${next.slug}`} className={`${s.next} ${passed ? s.ready : ""}`} onClick={slide("nav-forward")}>
              <span>next →</span>
              {wbr(next.title)}
            </a>
          ) : (
            <Link href="/play" className={`${s.next} ${passed ? s.ready : ""}`}>
              <span>done →</span>
              open the playground
            </Link>
          )}
        </nav>
      </article>

      <section className={s.work} aria-label="editor">
        <div className={s.head}>
          <span>lib.shi</span>
          <span className={s.muted}>⌘↵ to check</span>
        </div>
        <div className={s.code}>
          <div ref={srcEl} className={s.editor} />
          {!ready && <BootCode code={lesson.start} className={s.boot} />}
        </div>
        <div className={s.tabs} {...tabs.list} aria-label="output">
          <button {...tabs.tab("term")}>terminal{errors ? ` · ${errors} error${errors > 1 ? "s" : ""}` : ""}</button>
          <button {...tabs.tab("rs")}>lib.rs</button>
        </div>
        <div className={s.out}>
          <div className={s.term} hidden={view !== "term"} {...tabs.panel("term")}>
            <div role="log" aria-label="compiler output">
            {error ? (
              <pre className={s.err}>{error}</pre>
            ) : result == null ? (
              <pre className={s.dim}>loading the compiler…</pre>
            ) : (
              <>
                <pre className={s.dim}>$ typeshi check</pre>
                {result.diags.map((d, i) => (
                  <pre key={i} className={d.severity === "error" ? s.err : s.warn}>
                    {d.rendered.trimEnd()}
                  </pre>
                ))}
                <pre className={result.ok ? s.good : s.bad}>{result.ok ? "wagmi" : "ngmi"}</pre>
              </>
            )}
            </div>
          </div>
          <div ref={outEl} className={s.rs} hidden={view !== "rs"} {...tabs.panel("rs")} />
        </div>
      </section>
    </div>
  );
}
