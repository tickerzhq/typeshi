"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doneSet } from "./TourLesson";
import s from "./TourIndex.module.css";

type Item = { n: number; slug: string; title: string; blurb: string };

export default function TourIndex({ lessons }: { lessons: Item[] }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => setDone(doneSet()), []);
  const firstOpen = lessons.find((l) => !done.has(l.slug)) ?? lessons[0];
  return (
    <>
      <div className={s.start}>
        <Link href={`/tour/${firstOpen.slug}`} className={s.cta}>
          {done.size === 0 ? "start the tour" : done.size === lessons.length ? "start over" : "keep going"} →
        </Link>
        <span className={s.progress} aria-live="polite">
          {done.size} of {lessons.length} done
        </span>
      </div>
      <ol className={s.list}>
        {lessons.map((l) => (
          <li key={l.slug}>
            <Link href={`/tour/${l.slug}`} className={s.item} data-done={done.has(l.slug)}>
              <span className={s.n}>{done.has(l.slug) ? "✓" : String(l.n).padStart(2, "0")}</span>
              <span className={s.body}>
                <span className={s.title}>{l.title}</span>
                <span className={s.blurb}>{l.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </>
  );
}
