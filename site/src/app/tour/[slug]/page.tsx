import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TourLesson from "@/components/TourLesson";
import content from "@/generated/content.json";
import type { EditorWords } from "@/lib/types";
import type { Lesson } from "@/lib/types-tour";

const lessons = content.tour as Lesson[];

export const dynamicParams = false;

export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) return {};
  const first = lesson.body.split("\n\n")[0].replace(/[`*]/g, "");
  return { title: `${lesson.title} · tour`, description: first };
}

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = lessons.findIndex((l) => l.slug === slug);
  if (i < 0) notFound();
  const pick = (l?: Lesson) => (l ? { slug: l.slug, title: l.title } : null);
  return (
    <TourLesson
      lesson={lessons[i]}
      prev={pick(lessons[i - 1])}
      next={pick(lessons[i + 1])}
      total={lessons.length}
      words={content.editor as EditorWords}
    />
  );
}
