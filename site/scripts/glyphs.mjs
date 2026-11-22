// Reads glyph outlines out of a TrueType font (a .ttf, or a .woff wrapping one) and returns them as SVG
// path data, so the icons draw `fn` in Geist Mono itself instead of naming a font the OS may not have.
// Just enough of the format for that: cmap (format 4), hmtx, loca and simple glyf outlines.

import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

/** The font's tables, unwrapped from WOFF when it is one. */
function tables(buf) {
  const out = {};
  if (buf.toString("latin1", 0, 4) === "wOFF") {
    const n = buf.readUInt16BE(12);
    for (let i = 0; i < n; i++) {
      const e = 44 + i * 20;
      const tag = buf.toString("latin1", e, e + 4);
      const [off, comp, orig] = [buf.readUInt32BE(e + 4), buf.readUInt32BE(e + 8), buf.readUInt32BE(e + 12)];
      const raw = buf.subarray(off, off + comp);
      out[tag] = comp < orig ? inflateSync(raw) : raw;
    }
    return out;
  }
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const e = 12 + i * 16;
    out[buf.toString("latin1", e, e + 4)] = buf.subarray(buf.readUInt32BE(e + 8), buf.readUInt32BE(e + 8) + buf.readUInt32BE(e + 12));
  }
  return out;
}

/** Character code to glyph id, from the Windows Unicode BMP subtable (format 4). */
function cmap(t) {
  const n = t.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const [platform, encoding, off] = [t.readUInt16BE(4 + i * 8), t.readUInt16BE(6 + i * 8), t.readUInt32BE(8 + i * 8)];
    if (platform !== 3 || encoding !== 1 || t.readUInt16BE(off) !== 4) continue;
    const segs = t.readUInt16BE(off + 6) / 2;
    const at = (k, s) => off + 14 + k * segs * 2 + (k > 0 ? 2 : 0) + s * 2;
    return (code) => {
      for (let s = 0; s < segs; s++) {
        const end = t.readUInt16BE(at(0, s));
        if (code > end) continue;
        const start = t.readUInt16BE(at(1, s));
        if (code < start) return 0;
        const delta = t.readInt16BE(at(2, s));
        const rangeAt = at(3, s);
        const range = t.readUInt16BE(rangeAt);
        if (range === 0) return (code + delta) & 0xffff;
        const g = t.readUInt16BE(rangeAt + range + (code - start) * 2);
        return g === 0 ? 0 : (g + delta) & 0xffff;
      }
      return 0;
    };
  }
  throw new Error("glyphs: the font has no Unicode BMP cmap");
}

/** The points of a simple glyph, as contours of { x, y, on }. */
function outline(glyf, start) {
  const contours = glyf.readInt16BE(start);
  if (contours < 0) throw new Error("glyphs: composite glyphs aren't supported");
  const ends = Array.from({ length: contours }, (_, i) => glyf.readUInt16BE(start + 10 + i * 2));
  const count = contours ? ends.at(-1) + 1 : 0;
  let p = start + 10 + contours * 2;
  p += 2 + glyf.readUInt16BE(p);
  const flags = [];
  while (flags.length < count) {
    const f = glyf[p++];
    flags.push(f);
    if (f & 8) for (let r = glyf[p++]; r > 0; r--) flags.push(f);
  }
  const coords = (short, same) => {
    let v = 0;
    return flags.map((f) => {
      if (f & short) v += f & same ? glyf[p++] : -glyf[p++];
      else if (!(f & same)) (v += glyf.readInt16BE(p)), (p += 2);
      return v;
    });
  };
  const xs = coords(2, 16);
  const ys = coords(4, 32);
  const pts = flags.map((f, i) => ({ x: xs[i], y: ys[i], on: (f & 1) === 1 }));
  return ends.map((end, i) => pts.slice(i ? ends[i - 1] + 1 : 0, end + 1));
}

/**
 * Loads a font and returns `shape(text, size)`: the text set in that font at `size` px, with `tracking`
 * em added between letters, as SVG path data with its baseline at y = 0, plus its ink box.
 */
export function font(file) {
  const t = tables(readFileSync(file));
  const upem = t.head.readUInt16BE(18);
  const long = t.head.readInt16BE(50) === 1;
  const metrics = t.hhea.readUInt16BE(34);
  const glyphId = cmap(t.cmap);
  const advance = (g) => t.hmtx.readUInt16BE(Math.min(g, metrics - 1) * 4);
  const offset = (g) => (long ? t.loca.readUInt32BE(g * 4) : t.loca.readUInt16BE(g * 2) * 2);

  return function shape(text, size, tracking = 0) {
    const k = size / upem;
    const n = (v) => String(Number(v.toFixed(2)));
    let pen = 0;
    let d = "";
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const ch of text) {
      const g = glyphId(ch.codePointAt(0));
      if (!g) throw new Error(`glyphs: the font has no glyph for ${ch}`);
      if (offset(g + 1) > offset(g)) {
        for (const contour of outline(t.glyf, offset(g))) {
          // SVG's y runs down; the font's runs up.
          const pt = (q) => ({ x: pen + q.x * k, y: -q.y * k, on: q.on });
          const pts = contour.map(pt);
          for (const q of pts) {
            box.x0 = Math.min(box.x0, q.x);
            box.x1 = Math.max(box.x1, q.x);
            box.y0 = Math.min(box.y0, q.y);
            box.y1 = Math.max(box.y1, q.y);
          }
          // Two off-curve points in a row imply an on-curve point halfway between them.
          const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, on: true });
          const first = pts.findIndex((q) => q.on);
          const ring = first < 0 ? [mid(pts[0], pts[1]), ...pts.slice(1), pts[0]] : [...pts.slice(first), ...pts.slice(0, first)];
          d += `M${n(ring[0].x)} ${n(ring[0].y)}`;
          for (let i = 1; i <= ring.length; i++) {
            const q = ring[i % ring.length];
            if (q.on) {
              d += `L${n(q.x)} ${n(q.y)}`;
              continue;
            }
            const next = ring[(i + 1) % ring.length];
            const to = next.on ? next : mid(q, next);
            d += `Q${n(q.x)} ${n(q.y)} ${n(to.x)} ${n(to.y)}`;
            if (next.on) i++;
          }
          d += "Z";
        }
      }
      pen += advance(g) * k + tracking * size;
    }
    return { d, box };
  };
}
