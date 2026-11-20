import type { Metadata } from "next";
import TourIndex from "@/components/TourIndex";
import content from "@/generated/content.json";
import type { Lesson } from "@/lib/types-tour";
import s from "./tour.module.css";

export const metadata: Metadata = {
  title: "tour",
  description: `Learn typeshi in ${content.tour.length} short lessons, each checked by the real compiler in your browser.`,
};

export default function TourPage() {
  const lessons = (content.tour as Lesson[]).map(({ n, slug, chapter, title, body }) => ({
    n,
    slug,
    chapter,
    title,
    blurb: body.split("\n\n")[0].replace(/\*\*/g, ""),
  }));
  return (
    <div className={`wrap ${s.page}`}>
      <p className={s.eyebrow}>the tour</p>
      <h1 className={s.h1}>learn typeshi by breaking it.</h1>
      <p className={s.lede}>
        {lessons.length} short lessons in {new Set(lessons.map((l) => l.chapter)).size} chapters. Each one has a goal,
        and the real compiler checks it as you type. No install, nothing to sign up for. About half an hour.
      </p>
      <TourIndex lessons={lessons} />
    </div>
  );
}
