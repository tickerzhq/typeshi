// Did a lesson's goal happen? Shared by the build (to prove every lesson works) and the page.

/**
 * @param {{ ok: boolean, rust: string, diags: { severity: string, message: string, label: string }[] }} result
 * @param {{ kind: "ok" | "error", rust: string[], error: string | null }} check
 */
export function passes(result, check) {
  if (check.kind === "error") {
    return (
      !result.ok &&
      result.diags.some((d) => d.severity === "error" && `${d.message} ${d.label}`.includes(check.error ?? ""))
    );
  }
  return result.ok && check.rust.every((s) => result.rust.includes(s));
}
