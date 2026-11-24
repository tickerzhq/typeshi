"use client";

import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";
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
      <Contrast size={18} strokeWidth={1.5} aria-hidden="true" />
      <span className="visually-hidden">light theme</span>
    </button>
  );
}
