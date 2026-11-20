"use client";

import type { EditorView } from "@codemirror/view";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { passes } from "@/lib/check.mjs";
import { compiler } from "@/lib/compiler";
import type { CompileResult, EditorWords } from "@/lib/types";
import type { Lesson } from "@/lib/types-tour";
import { outputEditor, replaceDoc, showDiagnostics, sourceEditor } from "./editor";
import Prose from "./Prose";
import s from "./TourLesson.module.css";

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
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [result, setResult] = useState<CompileResult | null>(null);
  const [passed, setPassed] = useState(false);
  const [view, setView] = useState<"term" | "rs">("term");
  const [error, setError] = useState("");

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
      if (srcView.current) showDiagnostics(srcView.current, r.diags);
      if (outView.current) {
        replaceDoc(
          outView.current,
          r.ok ? r.rust : "// nothing here yet: lib.shi doesn't compile.\n// the terminal says why.\n",
        );
      }
      const ok = passes(r, lesson.check);
      setPassed(ok);
      if (ok) {
        const done = doneSet();
        done.add(lesson.slug);
        store.set(DONE_KEY, JSON.stringify([...done]));
      }
    },
    [lesson],
  );

  useEffect(() => {
    if (!srcEl.current || !outEl.current) return;
    const saved = store.get(codeKey(lesson.slug));
    const doc = saved ?? lesson.start;
    srcView.current = sourceEditor({
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
    outView.current = outputEditor(outEl.current);
    void run(doc);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      srcView.current?.destroy();
      outView.current?.destroy();
      srcView.current = outView.current = null;
    };
  }, [lesson, words, run]);

  const load = (code: string) => {
    if (!srcView.current) return;
    replaceDoc(srcView.current, code);
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
          {lesson.title}
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
          <button type="button" className={s.btn} onClick={() => load(lesson.solution)}>
            show solution
          </button>
        </div>

        <nav className={s.pager} aria-label="lessons">
          {prev ? (
            <Link href={`/tour/${prev.slug}`} className={s.prev}>
              <span>← back</span>
              {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/tour/${next.slug}`} className={`${s.next} ${passed ? s.ready : ""}`}>
              <span>next →</span>
              {next.title}
            </Link>
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
        <div ref={srcEl} className={s.editor} />
        <div className={s.tabs} role="tablist" aria-label="output">
          <button type="button" role="tab" aria-selected={view === "term"} onClick={() => setView("term")}>
            terminal{errors ? ` · ${errors} error${errors > 1 ? "s" : ""}` : ""}
          </button>
          <button type="button" role="tab" aria-selected={view === "rs"} onClick={() => setView("rs")}>
            lib.rs
          </button>
        </div>
        <div className={s.out}>
          <div className={s.term} hidden={view !== "term"} role="log" aria-label="compiler output">
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
          <div ref={outEl} className={s.rs} hidden={view !== "rs"} />
        </div>
      </section>
    </div>
  );
}
