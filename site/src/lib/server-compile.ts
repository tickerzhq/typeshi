// The same wasm compiler, on the server, for one job: shared programs (/p/...) and their link previews.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { initSync, transpile } from "../wasm/typeshi_wasm.js";
import type { CompileResult } from "./types";

let ready = false;

export function compileOnServer(src: string): Omit<CompileResult, "ms"> {
  if (!ready) {
    initSync({ module: readFileSync(join(process.cwd(), "public", "typeshi.wasm")) });
    ready = true;
  }
  return JSON.parse(transpile(src, false));
}

/** A share link's program: deflate-raw, base64url (lib/share.ts). Null if the link doesn't hold one. */
export function decodeShared(code: string): string | null {
  if (!/^[A-Za-z0-9_-]{4,12000}$/.test(code)) return null;
  try {
    const out = inflateRawSync(Buffer.from(code, "base64url"), { maxOutputLength: 64 * 1024 }).toString("utf8");
    return out.trim() ? out : null;
  } catch {
    return null;
  }
}

/** What a link preview and the page title say about a program: its name and the compiler's verdict. */
export function verdict(src: string) {
  const r = compileOnServer(src);
  const firstError = r.diags.find((d) => d.severity === "error");
  return {
    ok: r.ok,
    program: r.program ?? src.match(/stealth_launch\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? null,
    headline: r.ok ? "compiles. wagmi." : firstError ? `error: ${firstError.message}` : "ngmi",
    line: firstError?.line ?? 0,
    /** The first error exactly as the CLI prints it, for the link preview. */
    rendered: firstError?.rendered ?? null,
  };
}
