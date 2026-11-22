import type { Metadata } from "next";
import Footer from "@/components/Footer";
import PageHead from "@/components/PageHead";
import content from "@/generated/content.json";
import { fontKB, npm, PAGES, tokenCount, wasmGzipKB, wasmKB } from "@/lib/built";
import { pageMeta } from "@/lib/meta";
import s from "./built.module.css";

export const metadata: Metadata = pageMeta({
  path: "/built",
  title: "how it's built",
  description:
    "How typeshi is made: one Rust crate compiled for your terminal and for the browser, a static Next.js site, design tokens, and the checks that run on every pull request.",
});

const { crates, edition, msrv } = content.stack;

// Model: monte.markets/built and leadersheet.io/built (a pipeline, then the stack with versions read at build,
// then what keeps it honest), in typeshi's look: hairline rows, mono only for what you'd type.

const STEPS = [
  {
    name: "you write slang.",
    text: (
      <>
        typeshi reads <code>.shi</code> as Rust tokens, so every error keeps your file, line and column.
      </>
    ),
    n: `${content.keywords.length} keywords`,
  },
  {
    name: "it writes Anchor.",
    text: (
      <>
        the slang becomes plain Rust in a <code>lib.rs</code> next to your <code>.shi</code>. <code>typeshi build</code>{" "}
        hands it to <code>anchor build</code>.
      </>
    ),
    n: `typeshi v${content.version}`,
  },
  {
    name: "same crate, in your tab.",
    text: "built for wasm32, it runs in a web worker, so typing never waits on it. your code never leaves the browser.",
    n: `${wasmGzipKB} KB gzipped`,
  },
  {
    name: "printed ahead of time.",
    text: "Next.js renders every page and its share card at build. Vercel serves the files. there is no server code.",
    n: `${PAGES.length} pages`,
  },
];

type Row = { name: string; v?: string; what: string; href?: string };
const STACK: { title: string; rows: Row[] }[] = [
  {
    title: "the compiler",
    rows: [
      { name: "Rust", v: `${edition} edition`, what: `builds on Rust ${msrv} and up, checked on every pull request.`, href: "https://www.rust-lang.org" },
      { name: "proc-macro2", v: crates["proc-macro2"], what: "reads .shi as Rust tokens, with real lines and columns.", href: "https://crates.io/crates/proc-macro2" },
      { name: "syn", v: crates.syn, what: "parses the Rust it writes.", href: "https://crates.io/crates/syn" },
      { name: "prettyplease", v: crates.prettyplease, what: "prints it like a human wrote it.", href: "https://crates.io/crates/prettyplease" },
      { name: "Anchor", v: "1.2", what: "the Solana framework the output is for.", href: "https://www.anchor-lang.com" },
    ],
  },
  {
    title: "the browser",
    rows: [
      { name: "wasm-bindgen", v: crates["wasm-bindgen"], what: `the same crate as the CLI, as ${wasmKB} KB of WebAssembly.`, href: "https://github.com/wasm-bindgen/wasm-bindgen" },
      { name: "Web Worker", what: "the compiler runs off the main thread. no worker, it falls back to the page.", href: "https://developer.mozilla.org/docs/Web/API/Web_Workers_API" },
      { name: "CodeMirror", v: npm("@codemirror/view"), what: "the editor. its keyword lists come from the VS Code grammar in the repo.", href: "https://codemirror.net" },
    ],
  },
  {
    title: "the site",
    rows: [
      { name: "Next.js", v: npm("next"), what: "every page made ahead of time.", href: "https://nextjs.org" },
      { name: "React", v: npm("react"), what: "the playground, the tour, the theme switch.", href: "https://react.dev" },
      { name: "TypeScript", v: npm("typescript"), what: "strict, everywhere in the site.", href: "https://www.typescriptlang.org" },
      { name: "Geist, Geist Mono", what: `self-hosted, variable, cut to Latin: ${fontKB} KB for both.`, href: "https://vercel.com/font" },
      { name: "next/og", what: "draws each page's share card at build, from the same compiler output the page shows.", href: "https://nextjs.org/docs/app/api-reference/functions/image-response" },
    ],
  },
  {
    title: "checks and shipping",
    rows: [
      { name: "Playwright", v: npm("@playwright/test"), what: "the built site on a desktop and a phone.", href: "https://playwright.dev" },
      { name: "axe-core", v: npm("@axe-core/playwright"), what: "accessibility on every page, in both themes.", href: "https://github.com/dequelabs/axe-core" },
      { name: "GitHub Actions", what: "every check below, on every pull request.", href: "https://github.com/tickerzhq/typeshi/actions" },
      { name: "Dependabot", what: "crates, npm packages and actions, bumped as pull requests.", href: "https://docs.github.com/code-security/dependabot" },
      { name: "Vercel", what: "builds main and serves it.", href: "https://vercel.com" },
    ],
  },
];

const COLORS = [
  { token: "accent-fill", name: "lime", job: "wagmi. it worked, and the one button." },
  { token: "state-error", name: "red", job: "ngmi. errors and banned moves." },
  { token: "state-warning", name: "amber", job: "a warning." },
  { token: "syntax-keyword", name: "violet", job: "a keyword, in the editor." },
] as const;

const CHECKS = [
  { name: <code>cargo fmt</code>, text: "every file formatted the one way rustfmt likes." },
  { name: <code>cargo clippy</code>, text: "with -D warnings: not one warning. not even a small one." },
  { name: <code>cargo test</code>, text: "every keyword, every banned move, the CLI, the editor grammar, and the README pictures against what the compiler says today." },
  { name: <>Rust {msrv}</>, text: "the oldest Rust it promises to build on." },
  { name: <>the sync</>, text: "before every build: the wasm has to write the committed example lib.rs byte for byte, and every lesson has to fail before you start and pass with its solution." },
  { name: <code>npm test</code>, text: "the tokens match their JSON, nothing sets a color or size by hand, every text pair passes WCAG 2.2 AA in every theme, the icons match their drawing." },
  { name: <code>npm run e2e</code>, text: "a desktop and a phone: axe in both themes, nothing scrolls sideways at 320 px, 44 px tap targets, the real compiler answering." },
];

const OPEN = [
  { href: "/llms.txt", name: "llms.txt", text: "the whole language on one page, for agents." },
  { href: "/tokens/typeshi.resolver.json", name: "/tokens/", text: "the design tokens, in their W3C format." },
  { href: "/manifest.webmanifest", name: "manifest", text: "add it to a home screen. the icon is the fn tile." },
  { href: "https://github.com/tickerzhq/typeshi", name: "github", text: "the compiler, the site, all of it. MIT." },
];

export default function BuiltPage() {
  return (
    <>
      <div className={`wrap ${s.page}`}>
        <PageHead title="how it's built.">
          one Rust crate, compiled twice: once for your terminal, once for this tab. no server, no accounts, no cap.
          here&apos;s the whole stack, ser.
        </PageHead>

        <section aria-labelledby="flow-h">
          <h2 id="flow-h" className={s.h2}>
            from <code>.shi</code> to your screen
          </h2>
          <ol className={s.steps}>
            {STEPS.map((st, i) => (
              <li key={st.name}>
                <span className={s.stepN} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <b>{st.name}</b>
                <span>{st.text}</span>
                <span className={s.fact}>{st.n}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.section} aria-labelledby="stack-h">
          <h2 id="stack-h" className={s.h2}>
            the stack
          </h2>
          <div className={s.groups}>
            {STACK.map((g) => (
              <div key={g.title} className={s.group}>
                <h3 className={s.h3}>{g.title}</h3>
                <dl className={s.rows}>
                  {g.rows.map((r) => (
                    <div key={r.name} className={s.row}>
                      <dt>
                        {r.href ? <a href={r.href}>{r.name}</a> : r.name}
                        {r.v ? <span className={s.v}>{r.v}</span> : null}
                      </dt>
                      <dd>{r.what}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>

        <section className={s.section} aria-labelledby="system-h">
          <h2 id="system-h" className={s.h2}>
            the design system
          </h2>
          <p className={s.sub}>
            every color, type step, space step, corner and duration is a token: W3C design tokens (DTCG 2025.10) in,{" "}
            {tokenCount} CSS variables out. dark by default, a light theme, more contrast when your system asks. a test
            fails on any value set by hand.
          </p>
          <div className={s.system}>
            <ul className={s.colors} aria-label="colors, each with a job">
              {COLORS.map((c) => (
                <li key={c.token}>
                  <span className={s.swatch} data-color={c.token} aria-hidden="true" />
                  <b>{c.name}</b>
                  <span>{c.job}</span>
                </li>
              ))}
            </ul>
            <div className={s.type}>
              <figure className={s.spec}>
                <span className={s.sans} aria-hidden="true">
                  Aa
                </span>
                <figcaption>
                  <b>Geist</b> reading and headings.
                </figcaption>
              </figure>
              <figure className={s.spec}>
                <span className={s.mono} aria-hidden="true">
                  {"{}"}
                </span>
                <figcaption>
                  <b>Geist Mono</b> what you type and what it prints.
                </figcaption>
              </figure>
              <figure className={s.spec}>
                <span className={s.tile} aria-hidden="true">
                  fn
                </span>
                <figcaption>
                  <b>the mark</b> the header&apos;s fn, drawn from Geist Mono&apos;s own outlines into every icon a browser or
                  phone asks for.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className={s.section} aria-labelledby="checks-h">
          <h2 id="checks-h" className={s.h2}>
            what keeps it honest
          </h2>
          <p className={s.sub}>on every pull request, before anything ships. a joke language, built like it isn&apos;t one.</p>
          <ol className={s.checks}>
            {CHECKS.map((c, i) => (
              <li key={i}>
                <b>{c.name}</b>
                <span>{c.text}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={s.section} aria-labelledby="open-h">
          <h2 id="open-h" className={s.h2}>
            for robots, and the curious
          </h2>
          <ul className={s.open}>
            {OPEN.map((o) => (
              <li key={o.href}>
                <a href={o.href}>
                  <span className={s.openName}>
                    {o.name} <span aria-hidden="true">→</span>
                  </span>
                  <span className={s.openText}>{o.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Footer />
    </>
  );
}
