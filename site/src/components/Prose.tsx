/** The tiny bit of markdown the tour uses: paragraphs, ``` blocks, `code` and **bold**. */
function inline(text: string, key: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={`${key}-${i}`}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

export default function Prose({ text, className }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  const parts = text.split(/```[a-z]*\n([\s\S]*?)```/g);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      blocks.push(
        <pre key={`pre-${i}`}>
          <code>{part.replace(/\n$/, "")}</code>
        </pre>,
      );
      return;
    }
    part
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p, j) => blocks.push(<p key={`p-${i}-${j}`}>{inline(p, `${i}-${j}`)}</p>));
  });
  return <div className={className}>{blocks}</div>;
}
