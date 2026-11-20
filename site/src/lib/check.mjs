// Did a lesson's goal happen? Shared by the build (to prove every lesson works) and the page.
// kind "ok": it compiles and the Rust contains every `rust` string.
// kind "error": it doesn't compile, and an error mentions `error`.
// kind "warning": it compiles, and a warning mentions `warning`.

/**
 * @param {{ ok: boolean, rust: string, diags: { severity: string, message: string, label: string }[] }} result
 * @param {{ kind: "ok" | "error" | "warning", rust: string[], error: string | null, warning?: string | null }} check
 */
export function passes(result, check) {
  const says = (severity, text) =>
    result.diags.some((d) => d.severity === severity && `${d.message} ${d.label}`.includes(text ?? ""));
  if (check.kind === "error") return !result.ok && says("error", check.error);
  if (check.kind === "warning") return result.ok && says("warning", check.warning);
  return result.ok && check.rust.every((s) => result.rust.includes(s));
}
