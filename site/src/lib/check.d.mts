export type Check = { kind: "ok" | "error"; rust: string[]; error: string | null };
export function passes(
  result: { ok: boolean; rust: string; diags: { severity: string; message: string; label: string }[] },
  check: Check,
): boolean;
