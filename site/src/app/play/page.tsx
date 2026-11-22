import type { Metadata } from "next";
import Playground from "@/components/Playground";
import content from "@/generated/content.json";
import type { EditorWords, Example } from "@/lib/types";

export const metadata: Metadata = {
  title: "playground",
  description: "Write typeshi and watch it turn into Anchor Rust, live. The real compiler, running in your browser.",
  openGraph: { title: "playground · typeshi", url: "/play" },
};

export default function PlayPage() {
  return (
    <>
      <h1 className="visually-hidden">typeshi playground</h1>
      <Playground examples={content.examples as Example[]} words={content.editor as EditorWords} full />
    </>
  );
}
