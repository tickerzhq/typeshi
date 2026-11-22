import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Playground from "@/components/Playground";
import content from "@/generated/content.json";
import { decodeShared, verdict } from "@/lib/server-compile";
import type { EditorWords, Example } from "@/lib/types";

// The program is the URL, too long to cache as a file, so the page renders per request (it's light:
// one compile). Its link-preview card is cached at the edge for good (opengraph-image.tsx).
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const src = decodeShared(code);
  if (!src) return { title: "not found" };
  const v = verdict(src);
  const title = v.program ? `${v.program}, a typeshi program` : "a typeshi program";
  return {
    title,
    description: `${v.headline} Open it in the playground and run the real compiler in your browser.`,
    openGraph: { title, description: v.headline, url: `/p/${code}` },
    robots: { index: false },
  };
}

export default async function SharedProgram({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const src = decodeShared(code);
  if (!src) notFound();
  return (
    <>
      <h1 className="visually-hidden">a shared typeshi program</h1>
      <Playground examples={content.examples as Example[]} words={content.editor as EditorWords} initialSource={src} full />
    </>
  );
}
