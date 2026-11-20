export type Diag = {
  severity: "error" | "warning";
  message: string;
  label: string;
  /** 1-based. 0 means no location. */
  line: number;
  /** 0-based, in characters. */
  column: number;
  width: number;
  /** rustc-style, exactly what the CLI prints (without color). */
  rendered: string;
};

export type CompileResult = {
  ok: boolean;
  rust: string;
  program: string | null;
  fns: [string, number][];
  diags: Diag[];
  /** Wall time inside the compiler, in milliseconds. */
  ms: number;
};

export type Example = {
  id: string;
  title: string;
  blurb: string;
  path: string;
  source: string;
  ok: boolean;
  rustLines: number;
  diags: Pick<Diag, "severity" | "message" | "label" | "rendered">[];
};

export type EditorWords = {
  banned: string[];
  confessions: string[];
  macros: string[];
  attributes: string[];
  accounts: string[];
  control: string[];
  values: string[];
};
