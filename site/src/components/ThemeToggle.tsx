"use client";

import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/head";
import { colors, type Theme } from "@/lib/tokens";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.dataset.theme = "light";
  else delete root.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]["surface-page"]);
}

/** Dark is the look. This turns on the brand's light palette, and remembers it. */
export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(current);
    apply(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    apply(next);
    setTheme(next);
    try {
      if (next === "light") localStorage.setItem(THEME_KEY, "light");
      else localStorage.removeItem(THEME_KEY);
    } catch {}
  };

  return (
    <button type="button" className={className} aria-pressed={theme === "light"} onClick={toggle} title="light theme">
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5z" fill="currentColor" />
      </svg>
      <span className="visually-hidden">light theme</span>
    </button>
  );
}
