import s from "./BootCode.module.css";

/**
 * The program as plain text, sent with the HTML and laid out like the editor (line numbers, gutter,
 * line height), so a phone paints the code at once instead of waiting for CodeMirror. One block of
 * text, not a line per element, so it stays the page's largest paint (LCP) after the editor's lines
 * replace it. Hidden from screen readers: the editor is the real thing.
 */
export default function BootCode({ code, className = "" }: { code: string; className?: string }) {
  const text = code.replace(/\n$/, "");
  return (
    <div className={`${s.boot} ${className}`} aria-hidden="true">
      <pre className={s.nums}>{text.split("\n").map((_, i) => i + 1).join("\n")}</pre>
      <pre className={s.code}>{text}</pre>
    </div>
  );
}
