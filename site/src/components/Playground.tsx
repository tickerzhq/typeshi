"use client";

import type { EditorView } from "@codemirror/view";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { compiler } from "@/lib/compiler";
import { track } from "@vercel/analytics";
import { codeFromHash, decode, encode } from "@/lib/share";
import type { CompileResult, EditorWords, Example } from "@/lib/types";
import BootCode from "./BootCode";
import s from "./Playground.module.css";
import { useTabs } from "./Tabs";

type Editor = typeof import("./editor");

const DRAFT_KEY = "typeshi:draft";
const VESTING = "your build is vesting. 6-month cliff. come back later.";
const VESTING_ANYWAY = "(jk. building anyway.)";
const FILES = ["shi", "rs"] as const;

type Line = { kind: "cmd" | "out" | "err" | "warn" | "good" | "bad" | "dim"; text: string };

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

function fmtCap(n: number) {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1e3)}K`;
}

export default function Playground({
  examples,
  words,
  initialId = "gm_counter",
  initialSource,
  full = false,
}: {
  examples: Example[];
  words: EditorWords;
  initialId?: string;
  /** A program to open with (a shared link, /p/...). Wins over drafts and examples. */
  initialSource?: string;
  full?: boolean;
}) {
  const srcEl = useRef<HTMLDivElement>(null);
  const outEl = useRef<HTMLDivElement>(null);
  const srcView = useRef<EditorView | null>(null);
  const outView = useRef<EditorView | null>(null);
  /** CodeMirror, loaded after the page is interactive so it never delays the first paint. */
  const cm = useRef<Editor | null>(null);
  const source = useRef("");
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstKey = useRef<number | null>(null);
  const streak = useRef(0);
  const strip = useRef(false);
  /** True until the current program has compiled once; its output pane shouldn't show another program's Rust. */
  const fresh = useRef(true);

  const initial = examples.find((e) => e.id === initialId) ?? examples[0];
  const opening = initialSource ?? initial.source;
  const [exampleId, setExampleId] = useState(initialSource ? "" : initialId);
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [lines, setLines] = useState<Line[]>([{ kind: "dim", text: "loading the compiler…" }]);
  const [gigamaxx, setGigamaxx] = useState(false);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<(typeof FILES)[number]>("shi");
  const tabs = useTabs(FILES, tab, setTab);
  const selectId = useId();

  const say = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2400);
  }, []);

  const check = useCallback(async (src: string, mode: "check" | "build") => {
    const my = ++seq.current;
    let r: CompileResult;
    try {
      r = await compiler().compile(src, strip.current);
    } catch (e) {
      if (my === seq.current) setLines([{ kind: "err", text: `the compiler didn't load: ${String(e)}` }]);
      return;
    }
    if (my !== seq.current) return; // a newer edit already won

    setResult(r);
    const ed = cm.current;
    if (ed && srcView.current) ed.showDiagnostics(srcView.current, r.diags);
    if (ed && outView.current) {
      if (r.ok) {
        ed.replaceDoc(outView.current, r.rust);
        fresh.current = false;
      } else if (fresh.current) {
        ed.replaceDoc(
          outView.current,
          "// nothing here yet: lib.shi doesn't compile.\n// the terminal below says why. fix it in the .shi.\n",
        );
      }
    }

    const out: Line[] = [];
    const errors = r.diags.filter((d) => d.severity === "error").length;
    const warnings = r.diags.length - errors;
    if (mode === "build") {
      track("build", { ok: r.ok });
      out.push({ kind: "cmd", text: `$ typeshi build${strip.current ? " --gigamaxx" : ""}` });
      out.push({ kind: "out", text: VESTING }, { kind: "out", text: VESTING_ANYWAY });
    } else {
      out.push({ kind: "cmd", text: "$ typeshi check" });
    }
    for (const d of r.diags) out.push({ kind: d.severity === "error" ? "err" : "warn", text: d.rendered.trimEnd() });

    if (r.ok) {
      if (mode === "build") {
        streak.current = 0;
        const since = firstKey.current ? (Date.now() - firstKey.current) / 1000 : 0;
        const start = 6_900_000;
        const cap = start * Math.exp(-since / 900) * (0.985 + Math.random() * 0.01);
        const down = ((1 - cap / start) * 100).toFixed(1);
        out.push({
          kind: "dim",
          text: `wrote lib.rs: ${r.rust.split("\n").length} lines${r.program ? `, program ${r.program}` : ""}`,
        });
        out.push({ kind: "dim", text: `mcap ${fmtCap(cap)} (-${down}% since you started typing)` });
      } else if (warnings) {
        out.push({ kind: "dim", text: `${warnings} warning${warnings > 1 ? "s" : ""}. compiles anyway.` });
      }
      out.push({ kind: "good", text: "wagmi" });
    } else {
      if (mode === "build") {
        streak.current += 1;
        out.push({ kind: "bad", text: await compiler().escalation(streak.current) });
      } else {
        out.push({ kind: "dim", text: `${errors} error${errors > 1 ? "s" : ""}. fix it in the .shi.` });
      }
      out.push({ kind: "bad", text: "ngmi" });
    }
    setLines(out);
  }, []);

  const build = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    void check(source.current, "build");
  }, [check]);

  // Mount both editors once, after CodeMirror loads.
  useEffect(() => {
    let cancelled = false;
    source.current = opening;
    // Start the compiler while CodeMirror downloads; neither waits for the other.
    void check(opening, "check");
    (async () => {
      const ed = await import("./editor");
      if (cancelled || !srcEl.current || !outEl.current) return;
      cm.current = ed;
      srcView.current = ed.sourceEditor({
        parent: srcEl.current,
        doc: source.current,
        words,
        onChange: (doc) => {
          source.current = doc;
          firstKey.current ??= Date.now();
          if (full) store.set(DRAFT_KEY, doc);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => void check(doc, "check"), 110);
        },
        onBuild: build,
      });
      outView.current = ed.outputEditor(outEl.current);
      setReady(true);

      // A shared program (/p/...) opens as it is. Otherwise an old #code= link wins, then (on /play)
      // your last draft, then the example.
      if (initialSource) return;
      const code = codeFromHash(location.hash);
      const shared = code ? await decode(code) : null;
      const draft = full ? store.get(DRAFT_KEY) : null;
      const start = shared ?? draft;
      if (cancelled) return;
      if (start && start !== initial.source) {
        source.current = start;
        ed.replaceDoc(srcView.current, start);
        setExampleId("");
      }
      void check(source.current, "check");
    })();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      srcView.current?.destroy();
      outView.current?.destroy();
      srcView.current = outView.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = (id: string) => {
    const ex = examples.find((e) => e.id === id);
    if (!ex || !srcView.current || !cm.current) return;
    setExampleId(id);
    track("example", { id });
    fresh.current = true;
    source.current = ex.source;
    cm.current.replaceDoc(srcView.current, ex.source);
    srcView.current.scrollDOM.scrollTop = 0;
    if (outView.current) outView.current.scrollDOM.scrollTop = 0;
  };

  const share = async () => {
    const code = await encode(source.current);
    // A real path, not a #hash, so the server can put the program in the link preview.
    const url = `${location.origin}/p/${code}`;
    track("share");
    try {
      await navigator.clipboard.writeText(url);
      say("link copied. ser, share responsibly.");
    } catch {
      prompt("copy this link", url);
    }
  };

  const toggleGigamaxx = () => {
    strip.current = !strip.current;
    setGigamaxx(strip.current);
    void check(source.current, "check");
  };

  const errors = result?.diags.filter((d) => d.severity === "error").length ?? 0;
  const busy = !ready || result == null;

  return (
    <div className={`${s.cq} ${full ? s.full : ""}`}>
      <section className={s.pg} aria-label="typeshi playground" aria-busy={busy}>
        <div className={s.bar}>
          <div className={s.left}>
            <label htmlFor={selectId} className="visually-hidden">
              example program
            </label>
            <select
              id={selectId}
              className={s.select}
              value={exampleId}
              onChange={(e) => load(e.target.value)}
              disabled={!ready}
            >
              {exampleId === "" && <option value="">your program</option>}
              {examples.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                  {e.ok ? "" : " (doesn't compile)"}
                </option>
              ))}
            </select>
          </div>
          <div className={s.right}>
            <button
              type="button"
              className={s.flag}
              aria-pressed={gigamaxx}
              onClick={toggleGigamaxx}
              title="strip every log, like typeshi build --gigamaxx"
            >
              --gigamaxx
            </button>
            <button type="button" className={s.btn} onClick={share} disabled={!ready}>
              share
            </button>
            {!full && (
              <Link className={s.btn} href="/play">
                full screen
              </Link>
            )}
            <button type="button" className={`${s.btn} ${s.primary}`} onClick={build} disabled={busy}>
              build <kbd className={s.kbd}>⌘↵</kbd>
            </button>
          </div>
        </div>

        <div className={s.tabs} {...tabs.list} aria-label="file">
          <button {...tabs.tab("shi")}>lib.shi</button>
          <button {...tabs.tab("rs")}>lib.rs</button>
        </div>

        <div className={s.panes}>
          <div className={s.pane} data-show={tab === "shi"} {...tabs.panel("shi")}>
            <div className={s.head}>
              <span>lib.shi</span>
            </div>
            <div ref={srcEl} className={s.editor} />
            {!ready && <BootCode code={opening} className={s.boot} />}
          </div>
          <div className={s.pane} data-show={tab === "rs"} {...tabs.panel("rs")}>
            <div className={s.head}>
              <span>lib.rs</span>
              <span className={s.muted}>
                {result == null
                  ? "…"
                  : result.ok
                    ? `${result.rust.split("\n").length} lines · ${result.ms.toFixed(1)} ms`
                    : fresh.current
                      ? "doesn't compile"
                      : "last good build"}
              </span>
            </div>
            <div ref={outEl} className={`${s.editor} ${result && !result.ok ? s.stale : ""}`} />
          </div>
        </div>

        <div className={s.term} role="log" aria-live="polite" aria-label="compiler output">
          {lines.map((l, i) => (
            <pre key={i} className={s[l.kind]}>
              {l.text}
            </pre>
          ))}
        </div>

        <p className={s.status}>
          <span>
            {result ? (errors ? `${errors} error${errors > 1 ? "s" : ""}` : "compiles") : "loading"}
          </span>
          <span aria-live="polite" className={s.toast}>
            {toast}
          </span>
        </p>
      </section>
    </div>
  );
}
