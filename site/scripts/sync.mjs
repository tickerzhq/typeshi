// Pulls everything the site says about typeshi out of the repo itself, so the
// site can't drift from the compiler: the examples, the banned moves, the fixed
// error codes, the keyword table, the editor's keyword lists, and the real
// compiler output for every example (run through the same wasm the page loads).
//
// Writes src/generated/content.json. That file is committed, so a deploy of
// just this folder still works; when the repo is around, it is rebuilt.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const site = join(dirname(fileURLToPath(import.meta.url)), "..");
const repo = join(site, "..");
const out = join(site, "src/generated/content.json");

if (!existsSync(join(repo, "src/transpile.rs"))) {
  if (existsSync(out)) {
    console.log("sync: repo not found next to the site, keeping the committed content.json");
    process.exit(0);
  }
  console.error("sync: no repo and no committed content.json");
  process.exit(1);
}

const read = (p) => readFileSync(join(repo, p), "utf8");

// The compiler, exactly as the browser loads it.
const wasm = await import(join(site, "src/wasm/typeshi_wasm.js"));
wasm.initSync({ module: readFileSync(join(site, "public/typeshi.wasm")) });
const compile = (src) => JSON.parse(wasm.transpile(src, false));

// --- constants from src/transpile.rs -------------------------------------------
const transpileRs = read("src/transpile.rs");
const pairs = (name) => {
  const m = transpileRs.match(new RegExp(`pub const ${name}: \\[\\(&str, &str\\); \\d+\\] = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`sync: ${name} not found in src/transpile.rs`);
  return [...m[1].matchAll(/\("([^"]+)",\s*"((?:[^"\\]|\\.)*)"\)/g)].map((x) => [x[1], x[2].replace(/\\'/g, "'")]);
};
const banned = pairs("BANNED");
const fixedErrors = pairs("FIXED_ERRORS");

// --- the starter program from src/scaffold.rs --------------------------------
const scaffold = read("src/scaffold.rs");
const starterRaw = scaffold.match(/const LIB_SHI: &str = r#"([\s\S]*?)"#;/)?.[1];
if (!starterRaw) throw new Error("sync: LIB_SHI not found in src/scaffold.rs");
const starter = starterRaw
  .replaceAll("__NAME__", "gm_counter")
  .replaceAll("__ID__", "7PxhmDuhhe394QJgKyW1P7Ce4dPCfFPN2yKq4KCCj7Vj");

// --- examples --------------------------------------------------------------------
const examples = [
  { id: "gm_counter", title: "gm counter", blurb: "what `typeshi new` gives you. counts gms, farms aura.", source: starter },
  { id: "print_feed", title: "print feed", blurb: "an append-only feed. prints are forever.", file: "examples/trenches/programs/print_feed/src/lib.shi" },
  { id: "degen_desk", title: "degen desk", blurb: "every keyword in one program. a toy. do not run a desk on it.", file: "examples/trenches/programs/degen_desk/src/lib.shi" },
  { id: "rug", title: "rug", blurb: "a banned move. it does not compile.", file: "tests/fixtures/rug.shi" },
  { id: "edit_a_print", title: "edit a print", blurb: "#[on_god] means immutable. nobody can edit it.", file: "tests/fixtures/edit_a_print.shi" },
  { id: "no_disclaimer", title: "no disclaimer", blurb: "moves money without saying `// not financial advice`.", file: "tests/fixtures/no_disclaimer.shi" },
  { id: "friday", title: "friday deploy", blurb: "two banned moves at once.", file: "tests/fixtures/friday.shi" },
  { id: "warnings", title: "trust the dev", blurb: "compiles, with a warning. that's the feature.", file: "tests/fixtures/warnings.shi" },
].map((e) => {
  const source = e.source ?? read(e.file);
  const result = compile(source);
  return {
    id: e.id,
    title: e.title,
    blurb: e.blurb,
    path: e.file ?? "src/scaffold.rs (typeshi new)",
    source,
    ok: result.ok,
    rustLines: result.ok ? result.rust.split("\n").length : 0,
    diags: result.diags.map((d) => ({ severity: d.severity, message: d.message, label: d.label, rendered: d.rendered })),
  };
});

// The committed .rs must equal what the browser produces, or the claim on the page is false.
for (const [id, rs] of [
  ["print_feed", "examples/trenches/programs/print_feed/src/lib.rs"],
  ["degen_desk", "examples/trenches/programs/degen_desk/src/lib.rs"],
]) {
  const ex = examples.find((e) => e.id === id);
  const live = compile(ex.source).rust.trim();
  if (live !== read(rs).trim()) {
    throw new Error(`sync: the wasm build's output for ${id} differs from ${rs}. rebuild the wasm (npm run wasm) or regenerate the example.`);
  }
}

// --- the phrasebook on the home -----------------------------------------------------
// Lines of the starter program next to the lines the compiler writes for them. Each must be a whole
// line of gm_counter and a whole line of its lib.rs, or the build fails: the home never shows Rust
// the compiler didn't write.
const starterRust = compile(starter).rust;
const wholeLines = (text) => text.split("\n").map((l) => l.trim());
const phrasebook = [
  ["frame Counter {", "pub struct Counter {"],
  ["anon,", "pub anon: Signer<'info>,"],
  [`probably_nothing!("gm. we're live.");`, `msg!("gm. we're live.");`],
  ["were_so_back!()", "Ok(())"],
];
// The keywords page's share card shows other words of the same program the same way.
const keywordPairs = [
  ["stealth_launch gm_counter {", "pub mod gm_counter {"],
  ["cap_table Gm {", "pub struct Gm<'info> {"],
  ["lock_in fn gm(ctx) -> W {", "pub fn gm(ctx: Context<Gm>) -> Result<()> {"],
];
for (const [shi, rs] of [...phrasebook, ...keywordPairs]) {
  if (!wholeLines(starter).includes(shi)) throw new Error(`sync: phrasebook: "${shi}" is not a line of the starter program`);
  if (!wholeLines(starterRust).includes(rs)) throw new Error(`sync: phrasebook: the compiler no longer writes "${rs}" for the starter`);
}

// --- the keyword table from README.md ---------------------------------------------
const readme = read("README.md");
const kwSection = readme.split("## Keywords")[1]?.split("\n## ")[0];
if (!kwSection) throw new Error("sync: '## Keywords' not found in README.md");
const keywords = kwSection
  .split("\n")
  .filter((l) => l.startsWith("| ") && !l.startsWith("| typeshi") && !l.startsWith("|---"))
  .map((l) => {
    // Split on pipes that aren't inside backticks.
    const cells = [];
    let cur = "";
    let tick = false;
    for (const ch of l.slice(1, l.lastIndexOf("|"))) {
      if (ch === "`") tick = !tick;
      if (ch === "|" && !tick) {
        cells.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    cells.push(cur.trim());
    return { shi: cells[0], rust: cells[1] };
  });
const between = (start, end) => {
  const s = readme.indexOf(start);
  const e = readme.indexOf(end, s);
  return readme.slice(s, e).trim();
};
const confessions = between("Confessions do exactly", "\n\nBanned moves");
const cope = between("Every program gets `enum Cope`", "\n\nThe full tour");

// --- editor keyword lists from the VS Code grammar --------------------------------
const grammar = JSON.parse(read("editors/vscode/syntaxes/typeshi.tmLanguage.json"));
const words = (scope) => {
  for (const group of Object.values(grammar.repository)) {
    for (const p of group.patterns ?? [group]) {
      if (p.name === scope && p.match) {
        const m = p.match.match(/\(([^()]+)\)/);
        if (m) return m[1].split("|");
      }
    }
  }
  throw new Error(`sync: scope ${scope} not found in the grammar`);
};
const editor = {
  banned: words("invalid.illegal.banned-move.typeshi"),
  confessions: words("support.function.macro.confession.typeshi"),
  macros: words("support.function.macro.typeshi"),
  attributes: [...words("keyword.other.attribute.typeshi"), ...words("keyword.other.constraint.typeshi")],
  accounts: words("variable.language.typeshi"),
  control: ["bull", "bear", "mogs", "cuz", "cope", "stealth_launch", "frame", "term_sheet", "cap_table", "alpha_leak", "type_shi", "deadass", "lock_in", "ape", "few_understand"],
  values: ["diamond_hands", "paper_hands", "W", "ebitda", "L", "wen_moon"],
};
// The grammar and the compiler must agree on what's banned.
const bannedNames = banned.map(([n]) => n).sort().join(",");
if (editor.banned.slice().sort().join(",") !== bannedNames) {
  throw new Error(`sync: grammar banned moves (${editor.banned}) differ from BANNED (${bannedNames})`);
}

// --- what the CLI says, from src/banter.rs --------------------------------------
const banterRs = read("src/banter.rs");
const strList = (name) => {
  const m = banterRs.match(new RegExp(`pub const ${name}: \\[&str; \\d+\\] = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`sync: ${name} not found in src/banter.rs`);
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1].replace(/\\'/g, "'"));
};
const escalation = strList("ESCALATION");
const fud = strList("FUD");

// --- the tour, from site/tour/NN-slug/{lesson.md,start.shi,solution.shi} ----------
// lesson.md starts with "key: value" lines (title, check: ok|error, rust: <text>, error: <text>), then ---, then the body.
// Every lesson must start out failing its check and its solution must pass, through the real compiler.
// lesson.md keys: chapter, title, check: ok|error|warning, rust: <text> (repeatable), error: <text>, warning: <text>.
const { readdirSync } = await import("node:fs");

/**
 * The one line of real compiler output that shows a lesson's goal, for its share card: the line of
 * lib.rs the solution makes that holds the lesson's first `rust:` text, or the first line of the error
 * or warning it is about.
 */
function proof(dir, result, check) {
  if (check.kind === "ok") {
    const lines = result.rust.split("\n");
    const at = lines.findIndex((l) => l.includes(check.rust[0] ?? "\0"));
    if (at < 0) throw new Error(`sync: tour/${dir}: no line of the solution's lib.rs holds "${check.rust[0]}"`);
    return { kind: "ok", line: at + 1, text: lines[at].trim() };
  }
  const want = check[check.kind];
  const d = result.diags.find((x) => x.severity === check.kind && `${x.message} ${x.label}`.includes(want));
  if (!d) throw new Error(`sync: tour/${dir}: the solution's ${check.kind} doesn't say "${want}"`);
  return { kind: check.kind, line: null, text: d.rendered.split("\n")[0] };
}
const { passes } = await import(join(site, "src/lib/check.mjs"));
const tourDir = join(site, "tour");
const tour = readdirSync(tourDir)
  .filter((d) => /^\d\d-/.test(d))
  .sort()
  .map((dir, i) => {
    const raw = readFileSync(join(tourDir, dir, "lesson.md"), "utf8");
    const [head, ...rest] = raw.split("\n---\n");
    const meta = { rust: [] };
    for (const line of head.split("\n")) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (!m) continue;
      if (m[1] === "rust") meta.rust.push(m[2]);
      else meta[m[1]] = m[2];
    }
    if (!meta.title || !meta.chapter || !["ok", "error", "warning"].includes(meta.check)) {
      throw new Error(`sync: tour/${dir}/lesson.md needs chapter, title and check: ok|error|warning`);
    }
    if (meta.check !== "ok" && !meta[meta.check]) throw new Error(`sync: tour/${dir} checks for a ${meta.check} but names none`);
    const check = { kind: meta.check, rust: meta.rust, error: meta.error ?? null, warning: meta.warning ?? null };
    const start = readFileSync(join(tourDir, dir, "start.shi"), "utf8");
    const solution = readFileSync(join(tourDir, dir, "solution.shi"), "utf8");
    if (passes(compile(start), check)) throw new Error(`sync: tour/${dir} already passes before you do anything`);
    if (!passes(compile(solution), check)) throw new Error(`sync: tour/${dir}'s solution doesn't pass its own check`);
    const startResult = compile(start);
    return {
      n: i + 1,
      slug: dir.slice(3),
      chapter: meta.chapter,
      title: meta.title,
      body: rest.join("\n---\n").trim(),
      start,
      solution,
      check,
      startCompiles: startResult.ok,
      proof: proof(dir, compile(solution), check),
    };
  });

// --- cross-links -----------------------------------------------------------------------
// Each banned move gets a ready-to-run program (as a /play#code= link), proven to be refused.
// Each keyword row links to the first lesson that uses its word.
const deflate = async (text) => {
  const body = new Blob([new TextEncoder().encode(text)]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return Buffer.from(await new Response(body).arrayBuffer()).toString("base64url");
};
const rugFixture = read("tests/fixtures/rug.shi");
const bannedTry = {};
for (const [name] of banned) {
  const src = rugFixture.replace("rug!(pool);", `${name}!(pool);`);
  const r = compile(src);
  if (r.ok || !r.diags.some((d) => d.message.length && d.label.includes(`\`${name}!\` is a banned move`))) {
    throw new Error(`sync: the try-it program for ${name}! isn't refused as a banned move`);
  }
  bannedTry[name] = await deflate(src);
}
const firstWord = (cell) => (cell.match(/`([^`]+)`/)?.[1] ?? "").match(/^#?\[?[A-Za-z_]+!?/)?.[0] ?? "";
for (const row of keywords) {
  const word = firstWord(row.shi).replace(/^#\[/, "");
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^A-Za-z0-9_])${esc}(?![A-Za-z0-9_])`);
  const lesson = word.length > 1 && tour.find((l) => re.test(l.start) || re.test(l.solution));
  row.lesson = lesson ? lesson.slug : null;
}

const cargoToml = read("Cargo.toml");
const version = cargoToml.match(/^version = "([^"]+)"/m)[1];

// --- what /built says the compiler is made of, from Cargo.toml and the lockfiles ----------------
const locked = (file, name) => {
  const v = read(file).match(new RegExp(`\\nname = "${name}"\\nversion = "([^"]+)"`))?.[1];
  if (!v) throw new Error(`sync: ${name} not found in ${file}`);
  return v;
};
const stack = {
  edition: cargoToml.match(/^edition = "([^"]+)"/m)[1],
  msrv: cargoToml.match(/^rust-version = "([^"]+)"/m)[1],
  crates: {
    "proc-macro2": locked("Cargo.lock", "proc-macro2"),
    syn: locked("Cargo.lock", "syn"),
    prettyplease: locked("Cargo.lock", "prettyplease"),
    "wasm-bindgen": locked("site/wasm/Cargo.lock", "wasm-bindgen"),
  },
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  JSON.stringify({ version, stack, banned, bannedTry, fixedErrors, escalation, fud, examples, phrasebook, keywordPairs, keywords, confessions, cope, editor, tour }, null, 1) + "\n",
);
console.log(`sync: ${tour.length} tour lessons, ${examples.length} examples, ${banned.length} banned moves, ${keywords.length} keyword rows, v${version}`);
