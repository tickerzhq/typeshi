// One compiler per page. Prefers a Web Worker; falls back to the main thread if the
// browser won't start one (some privacy modes, old Safari).
import type { CompileResult } from "./types";

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void };

class Compiler {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private seq = 0;
  private direct: Promise<typeof import("../wasm/typeshi_wasm.js")> | null = null;

  constructor() {
    try {
      this.worker = new Worker(new URL("./compiler.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e) => {
        const { id, result, error } = e.data as { id: number; result?: unknown; error?: string };
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        if (error) p.reject(new Error(error));
        else p.resolve(result);
      };
      this.worker.onerror = () => this.fallBack();
    } catch {
      this.fallBack();
    }
  }

  private fallBack() {
    this.worker?.terminate();
    this.worker = null;
    for (const [, p] of this.pending) p.reject(new Error("worker unavailable"));
    this.pending.clear();
  }

  private mainThread() {
    this.direct ??= import("../wasm/typeshi_wasm.js").then(async (m) => {
      await m.default({ module_or_path: "/typeshi.wasm" });
      return m;
    });
    return this.direct;
  }

  private ask<T>(msg: Record<string, unknown>): Promise<T> {
    const worker = this.worker;
    if (!worker) return Promise.reject(new Error("no worker"));
    const id = ++this.seq;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      worker.postMessage({ id, ...msg });
    });
  }

  async compile(src: string, strip: boolean): Promise<CompileResult> {
    if (this.worker) {
      try {
        return await this.ask<CompileResult>({ kind: "compile", src, strip });
      } catch {
        this.fallBack();
      }
    }
    const m = await this.mainThread();
    const t0 = performance.now();
    const result = JSON.parse(m.transpile(src, strip)) as CompileResult;
    result.ms = performance.now() - t0;
    return result;
  }

  async escalation(streak: number): Promise<string> {
    if (this.worker) {
      try {
        return await this.ask<string>({ kind: "escalation", streak });
      } catch {
        this.fallBack();
      }
    }
    return (await this.mainThread()).escalation(streak);
  }
}

let instance: Compiler | null = null;
export function compiler(): Compiler {
  instance ??= new Compiler();
  return instance;
}
