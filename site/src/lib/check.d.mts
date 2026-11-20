export type Check = { kind: "ok" | "error" | "warning"; rust: string[]; error: string | null; warning?: string | null };
export function passes(
  result: { ok: boolean; rust: string; diags: { severity: string; message: string; label: string }[] },
  check: Check,
): boolean;
