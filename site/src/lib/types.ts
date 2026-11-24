export type Diag = {
  severity: "error" | "warning";
  message: string;
  label: string;
  /** 1-based. 0 means no location. */
  line: number;
  /** 0-based, in characters. */
  column: number;
  width: number;
  /** The check that refused it (`SHI006`), or null. `typeshi explain <code>` prints its page. */
  code: string | null;
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

/** A real exploit rewritten in typeshi (docs/exploits), and what the compiler says about it. */
export type Exploit = {
  id: string;
  name: string;
  /** "on Base, in Solidity; ..." when the original wasn't a Solana program. */
  note: string | null;
  date: string;
  lost: string;
  check: string;
  checkTitle: string;
  source: string;
  what: string;
  program: string;
  rendered: string;
  /** Millions of dollars lost, read from `lost`; 0 when it was counted in SOL. */
  usdM: number;
  /** The loss as the ledger shows it: `$320M`, `$230K`, `1,027 SOL`. */
  amount: string;
  /** The program, compressed, for a /play#code= link. */
  tryCode: string;
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
