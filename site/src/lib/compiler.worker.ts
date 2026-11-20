/// <reference lib="webworker" />
// The real typeshi compiler, off the main thread so typing never waits on it.
import init, { transpile, escalation } from "../wasm/typeshi_wasm.js";

const ready = init({ module_or_path: "/typeshi.wasm" });

type Req =
  | { id: number; kind: "compile"; src: string; strip: boolean }
  | { id: number; kind: "escalation"; streak: number };

self.onmessage = async (e: MessageEvent<Req>) => {
  const msg = e.data;
  try {
    await ready;
    if (msg.kind === "compile") {
      const t0 = performance.now();
      const result = JSON.parse(transpile(msg.src, msg.strip));
      result.ms = performance.now() - t0;
      self.postMessage({ id: msg.id, result });
    } else {
      self.postMessage({ id: msg.id, result: escalation(msg.streak) });
    }
  } catch (err) {
    self.postMessage({ id: msg.id, error: String(err) });
  }
};
