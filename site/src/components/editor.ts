// CodeMirror 6, not Monaco: a fraction of the weight and it works on phones
// (Replit and Sourcegraph both switched for those reasons).
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { rust } from "@codemirror/lang-rust";
import { bracketMatching, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { type Diagnostic, lintGutter, setDiagnostics } from "@codemirror/lint";
import { EditorState, type Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  MatchDecorator,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import type { Diag, EditorWords } from "@/lib/types";

const style = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "var(--syn-kw)" },
  { tag: [t.string, t.special(t.string), t.character], color: "var(--syn-str)" },
  { tag: [t.number, t.bool, t.null], color: "var(--syn-num)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--syn-type)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--syn-fn)" },
  { tag: t.macroName, color: "var(--syn-macro)" },
  { tag: [t.lineComment, t.blockComment, t.docComment], color: "var(--syn-comment)", fontStyle: "italic" },
  { tag: [t.attributeName, t.meta], color: "var(--soft)" },
  { tag: t.self, color: "var(--syn-kw)" },
]);

const theme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "13.5px", backgroundColor: "transparent", color: "var(--ink)" },
    ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "1.65", overflow: "auto" },
    ".cm-content": { padding: "12px 0", caretColor: "var(--wagmi)" },
    ".cm-line": { padding: "0 16px 0 8px" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--faint)",
      border: "none",
      fontVariantNumeric: "tabular-nums",
    },
    ".cm-lineNumbers .cm-gutterElement": { padding: "0 4px 0 14px", minWidth: "36px" },
    ".cm-activeLine": { backgroundColor: "oklch(1 0 0 / 0.03)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--soft)" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--wagmi)", borderLeftWidth: "2px" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "oklch(0.89 0.19 128 / 0.22) !important",
    },
    "&.cm-focused": { outline: "none" },
    ".cm-matchingBracket": { backgroundColor: "oklch(1 0 0 / 0.08)", outline: "none" },
    ".cm-gutter-lint": { width: "14px" },
    ".cm-lint-marker": { width: "10px", height: "10px" },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-raised)",
      border: "1px solid var(--line-strong)",
      borderRadius: "8px",
      color: "var(--ink)",
      overflow: "hidden",
    },
    ".cm-tooltip-lint": { fontFamily: "var(--mono)", fontSize: "12.5px" },
    ".cm-diagnostic": { padding: "8px 12px", whiteSpace: "pre-wrap", borderLeftWidth: "3px" },
    ".cm-diagnostic-error": { borderLeftColor: "var(--ngmi)" },
    ".cm-diagnostic-warning": { borderLeftColor: "var(--warn)" },
    ".cm-lintRange-error": {
      backgroundImage: "none",
      textDecoration: "underline wavy var(--ngmi)",
      textUnderlineOffset: "4px",
      textDecorationSkipInk: "none",
    },
    ".cm-lintRange-warning": {
      backgroundImage: "none",
      textDecoration: "underline wavy var(--warn)",
      textUnderlineOffset: "4px",
      textDecorationSkipInk: "none",
    },
    ".cm-shi-slang, .cm-shi-slang span": { color: "var(--syn-slang)" },
    ".cm-shi-macro, .cm-shi-macro span": { color: "var(--syn-slang)" },
    ".cm-shi-value, .cm-shi-value span": { color: "var(--syn-num)" },
    ".cm-shi-account, .cm-shi-account span": { color: "var(--syn-type)", fontStyle: "italic" },
    ".cm-shi-confession, .cm-shi-confession span": {
      color: "var(--warn)",
      textDecoration: "underline dotted",
      textUnderlineOffset: "4px",
    },
    ".cm-shi-banned, .cm-shi-banned span": { color: "var(--ngmi)", fontWeight: "600" },
  },
  { dark: true },
);

/** Highlights typeshi's own words on top of Rust highlighting, from the same lists the VS Code grammar uses. */
function slang(words: EditorWords): Extension {
  const alt = (xs: string[]) => [...xs].sort((a, b) => b.length - a.length).join("|");
  const groups: [string, string][] = [
    [`\\b(?:${alt(words.banned)})!`, "cm-shi-banned"],
    [`\\b(?:${alt(words.confessions)})!`, "cm-shi-confession"],
    [`\\b(?:${alt(words.macros)})!`, "cm-shi-macro"],
    [`\\b(?:${alt(words.control)})\\b`, "cm-shi-slang"],
    [`\\b(?:${alt(words.values)})\\b`, "cm-shi-value"],
    [`\\b(?:${alt([...words.accounts, ...words.attributes])})\\b`, "cm-shi-account"],
  ];
  const re = new RegExp(groups.map(([g]) => `(${g})`).join("|"), "g");
  const marks = groups.map(([, cls]) => Decoration.mark({ class: cls }));
  const decorator = new MatchDecorator({
    regexp: re,
    decoration: (m) => marks[m.slice(1).findIndex((g) => g !== undefined)] ?? marks[3],
  });
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }
      update(u: ViewUpdate) {
        this.decorations = decorator.updateDeco(u, this.decorations);
      }
    },
    { decorations: (v) => v.decorations },
  );
}

const base = (): Extension[] => [
  lineNumbers(),
  highlightActiveLineGutter(),
  drawSelection(),
  highlightActiveLine(),
  bracketMatching(),
  rust(),
  syntaxHighlighting(style),
  theme,
  EditorView.lineWrapping,
];

export function sourceEditor(opts: {
  parent: HTMLElement;
  doc: string;
  words: EditorWords;
  onChange: (doc: string) => void;
  onBuild: () => void;
}): EditorView {
  return new EditorView({
    parent: opts.parent,
    state: EditorState.create({
      doc: opts.doc,
      extensions: [
        ...base(),
        history(),
        indentOnInput(),
        lintGutter(),
        slang(opts.words),
        keymap.of([
          { key: "Mod-Enter", run: () => (opts.onBuild(), true), preventDefault: true },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({
          "aria-label": "typeshi source, lib.shi. Press Escape then Tab to leave the editor.",
          spellcheck: "false",
          autocapitalize: "off",
          autocorrect: "off",
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) opts.onChange(u.state.doc.toString());
        }),
      ],
    }),
  });
}

export function outputEditor(parent: HTMLElement): EditorView {
  return new EditorView({
    parent,
    state: EditorState.create({
      doc: "",
      extensions: [
        ...base(),
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        EditorView.contentAttributes.of({ "aria-label": "generated Anchor Rust, lib.rs (read only)", tabindex: "0" }),
      ],
    }),
  });
}

export function replaceDoc(view: EditorView, doc: string) {
  const cur = view.state.doc.toString();
  if (cur === doc) return;
  view.dispatch({ changes: { from: 0, to: cur.length, insert: doc } });
}

/** Puts the compiler's diagnostics on the lines they point at. */
export function showDiagnostics(view: EditorView, diags: Diag[]) {
  const doc = view.state.doc;
  const out: Diagnostic[] = [];
  for (const d of diags) {
    let from = 0;
    let to = Math.min(doc.length, 1);
    if (d.line >= 1 && d.line <= doc.lines) {
      const line = doc.line(d.line);
      from = Math.min(line.from + d.column, line.to);
      to = Math.min(from + Math.max(1, d.width), line.to);
      if (to <= from) to = Math.min(from + 1, doc.length);
    }
    out.push({
      from,
      to,
      severity: d.severity,
      message: d.label ? `${d.message}\n${d.label}` : d.message,
      source: "typeshi",
    });
  }
  view.dispatch(setDiagnostics(view.state, out));
}
