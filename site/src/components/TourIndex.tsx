"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Inline from "./Inline";
import { doneSet } from "./TourLesson";
import s from "./TourIndex.module.css";

type Item = { n: number; slug: string; chapter: string; title: string; blurb: string };

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
      {[...new Set(lessons.map((l) => l.chapter))].map((chapter) => {
        const inChapter = lessons.filter((l) => l.chapter === chapter);
        const doneHere = inChapter.filter((l) => done.has(l.slug)).length;
        return (
          <section key={chapter} className={s.chapter} aria-labelledby={`ch-${chapter.replace(/\s+/g, "-")}`}>
            <h2 id={`ch-${chapter.replace(/\s+/g, "-")}`} className={s.chapterTitle}>
              <span>{chapter}</span>
              <span className={s.chapterCount}>
                {doneHere}/{inChapter.length}
              </span>
            </h2>
            <ol className={s.list} start={inChapter[0].n}>
              {inChapter.map((l) => (
                <li key={l.slug}>
                  <Link href={`/tour/${l.slug}`} className={s.item} data-done={done.has(l.slug)}>
                    <span className={s.n}>{done.has(l.slug) ? "✓" : String(l.n).padStart(2, "0")}</span>
                    <span className={s.body}>
                      <span className={s.title}>{l.title}</span>
                      <span className={s.blurb}>
                        <Inline text={l.blurb} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
