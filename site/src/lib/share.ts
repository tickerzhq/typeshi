// Code lives in the URL hash, compressed, like the TypeScript playground.
// No server, no accounts, nothing to store. Native CompressionStream, no dependency.

const toB64Url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromB64Url = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const body = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(body).arrayBuffer());
}

export async function encode(src: string): Promise<string> {
  return toB64Url(await pipe(new TextEncoder().encode(src), new CompressionStream("deflate-raw")));
}

export async function decode(code: string): Promise<string | null> {
  try {
    return new TextDecoder().decode(await pipe(fromB64Url(code), new DecompressionStream("deflate-raw")));
  } catch {
    return null;
  }
}

export function codeFromHash(hash: string): string | null {
  const m = hash.match(/[#&]code=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
