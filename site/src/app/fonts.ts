import localFont from "next/font/local";

// Geist and Geist Mono (SIL OFL 1.1, src/fonts/OFL.txt), variable, cut to Latin with fontTools:
// 65 KB for both instead of 140 KB. Sans gets next/font's metric-matched Arial fallback
// (size-adjust, ascent and descent overrides), so nothing moves when it swaps in. The mono
// fallbacks are monospace fonts with Geist Mono's own 0.6 em advance, so lines keep their length.
// Cut again with: pyftsubset <font> --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,
//   U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+21B5,U+2212,U+2215,U+FEFF,U+FFFD"
//   --layout-features='*' --flavor=woff2

export const sans = localFont({
  src: "../fonts/Geist-Latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const mono = localFont({
  src: "../fonts/GeistMono-Latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
});
