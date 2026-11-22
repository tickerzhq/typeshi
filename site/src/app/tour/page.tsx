import type { Metadata } from "next";
import Footer from "@/components/Footer";
import PageHead from "@/components/PageHead";
import TourIndex from "@/components/TourIndex";
import content from "@/generated/content.json";
import type { Lesson } from "@/lib/types-tour";
import s from "./tour.module.css";

export const metadata: Metadata = {
  title: "tour",
  description: `Learn typeshi in ${content.tour.length} short lessons, each checked by the real compiler in your browser.`,
  openGraph: { title: "the tour · typeshi", url: "/tour" },
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
    <>
      <div className={`wrap ${s.page}`}>
        <PageHead title="learn typeshi by breaking it.">
          {lessons.length} lessons, about half an hour. The compiler checks each one as you type.
        </PageHead>
        <TourIndex lessons={lessons} />
      </div>
      <Footer />
    </>
  );
}
