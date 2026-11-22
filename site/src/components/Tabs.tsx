"use client";

import { type KeyboardEvent, useId, useRef } from "react";

/**
 * The one tabs primitive (WAI-ARIA Authoring Practices, "Tabs with automatic activation"):
 * only the selected tab is in the tab order, arrow keys and Home/End move between tabs,
 * and each tab names the panel it controls. Spread `list`, `tab(id)` and `panel(id)` onto your own elements.
 */
export function useTabs<T extends string>(ids: readonly T[], value: T, onChange: (id: T) => void) {
  const base = useId();
  const refs = useRef(new Map<T, HTMLButtonElement | null>());
  const tabId = (id: T) => `${base}-tab-${id}`;
  const panelId = (id: T) => `${base}-panel-${id}`;

  const onKeyDown = (e: KeyboardEvent) => {
    const i = ids.indexOf(value);
    const keys: Record<string, T | undefined> = {
      ArrowRight: ids[(i + 1) % ids.length],
      ArrowLeft: ids[(i - 1 + ids.length) % ids.length],
      Home: ids[0],
      End: ids[ids.length - 1],
    };
    const to = keys[e.key];
    if (!to) return;
    e.preventDefault();
    onChange(to);
    refs.current.get(to)?.focus();
  };

  return {
    list: { role: "tablist" as const, onKeyDown },
    tab: (id: T) => ({
      role: "tab" as const,
      type: "button" as const,
      id: tabId(id),
      "aria-selected": id === value,
      "aria-controls": panelId(id),
      tabIndex: id === value ? 0 : -1,
      onClick: () => onChange(id),
      ref: (el: HTMLButtonElement | null) => {
        refs.current.set(id, el);
      },
    }),
    panel: (id: T) => ({ role: "tabpanel" as const, id: panelId(id), "aria-labelledby": tabId(id) }),
  };
}
