// Color math for the token generator and the contrast test. No dependencies.
// OKLCH -> linear sRGB / Display P3 (Björn Ottosson's OKLab matrices), gamut mapping by
// chroma reduction (CSS Color 4's approach, simplified), WCAG 2.2 contrast and APCA Lc (0.1.9).

const rad = (d) => (d * Math.PI) / 180;

/** OKLCH (L 0..1, C, H degrees) to linear sRGB, unclamped. */
export function oklchToLinearSrgb([L, C, H]) {
  const a = C * Math.cos(rad(H));
  const b = C * Math.sin(rad(H));
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const linearSrgbToP3 = ([r, g, b]) => [
  0.8224621 * r + 0.177538 * g,
  0.0331941 * r + 0.9668058 * g,
  0.0170827 * r + 0.0723974 * g + 0.9105199 * b,
];

const EPS = 1e-4;
const inUnit = (rgb) => rgb.every((c) => c >= -EPS && c <= 1 + EPS);

export const inSrgb = (lch) => inUnit(oklchToLinearSrgb(lch));
export const inP3 = (lch) => inUnit(linearSrgbToP3(oklchToLinearSrgb(lch)));

/** The same lightness and hue with chroma reduced until it fits sRGB. */
export function toSrgbGamut([L, C, H]) {
  if (inSrgb([L, C, H])) return [L, C, H];
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (inSrgb([L, mid, H])) lo = mid;
    else hi = mid;
  }
  return [L, lo, H];
}

const encode = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (c) => Math.min(1, Math.max(0, c));

/** Gamma-encoded sRGB 0..1 after gamut mapping. */
export function toSrgb(lch) {
  return oklchToLinearSrgb(toSrgbGamut(lch)).map((c) => clamp01(encode(clamp01(c))));
}

export function hex(lch, alpha = 1) {
  const h = toSrgb(lch)
    .map((c) => Math.round(c * 255).toString(16).padStart(2, "0"))
    .join("");
  return alpha < 1 ? `#${h}${Math.round(alpha * 255).toString(16).padStart(2, "0")}` : `#${h}`;
}

/** Paints `top` (with alpha) over an opaque `bottom`, in sRGB like a browser does. */
export function over(top, alpha, bottom) {
  const t = toSrgb(top);
  const b = toSrgb(bottom);
  return t.map((c, i) => c * alpha + b[i] * (1 - alpha));
}

const decode = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (srgb) => {
  const [r, g, b] = srgb.map(decode);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG 2.2 contrast ratio between two gamma-encoded sRGB colors. */
export function wcag(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** APCA-W3 0.1.9 lightness contrast (Lc) of text `fg` on `bg`. Negative means light text on dark. */
export function apca(fg, bg) {
  const y = ([r, g, b]) => 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
  const clampBlack = (v) => (v > 0.022 ? v : v + (0.022 - v) ** 1.414);
  const txt = clampBlack(y(fg));
  const bgY = clampBlack(y(bg));
  if (Math.abs(bgY - txt) < 0.0005) return 0;
  if (bgY > txt) {
    const s = (bgY ** 0.56 - txt ** 0.57) * 1.14;
    return s < 0.1 ? 0 : (s - 0.027) * 100;
  }
  const s = (bgY ** 0.65 - txt ** 0.62) * 1.14;
  return s > -0.1 ? 0 : (s + 0.027) * 100;
}
