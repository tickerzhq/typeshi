"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import Inline from "./Inline";
import s from "./Keywords.module.css";

export default function Keywords({ rows }: { rows: { shi: string; rust: string; lesson?: string | null }[] }) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim().toLowerCase());
  const id = useId();
  const shown = query ? rows.filter((r) => (r.shi + " " + r.rust).toLowerCase().includes(query)) : rows;
  return (
    <div className={s.box}>
      <label htmlFor={id} className={s.label}>
        find a keyword
      </label>
      <input
        id={id}
        className={s.input}
        type="search"
        placeholder="rug, bull, ctx, mint…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <div className={s.scroll}>
        <table className={s.table}>
          <caption className="visually-hidden">typeshi keywords and the Rust or Anchor they become</caption>
          <thead>
            <tr>
              <th scope="col">typeshi</th>
              <th scope="col">Rust / Anchor</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.shi}>
                <td>
                  <Inline text={r.shi} />
                  {r.lesson && (
                    <Link href={`/tour/${r.lesson}`} className={s.lesson}>
                      lesson
                    </Link>
                  )}
                </td>
                <td>
                  <Inline text={r.rust} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {shown.length === 0 && <p className={s.none}>nothing matches. skill issue.</p>}
      </div>
      <p className={s.count} aria-live="polite">
        {shown.length} of {rows.length}
      </p>
    </div>
  );
}
