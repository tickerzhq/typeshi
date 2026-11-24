import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/** Tickerz's arrow out of a section heading: up and to the right, 14px, in the second text tone. */
export function Arrow({ className = "size-3.5" }: { className?: string }) {
  return <ArrowUpRight className={className} strokeWidth={1.75} aria-hidden="true" />;
}

/**
 * A section, as tickerz.com's home draws them (tk-sec, tk-rule, tk-h2), with its numbers: 80px of space (48px under
 * 900px), a hairline, 32px (24px), then the heading at the section step, weight 450, linking to its page with the
 * arrow 12px after the word, and one line under it. Children follow 40px under the heading block (28px).
 */
export default function Section({
  id,
  title,
  href,
  sub,
  className = "",
  children,
}: {
  id: string;
  title: React.ReactNode;
  href?: string;
  sub?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const word = href ? (
    <Link href={href} className="group inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-3 text-inherit no-underline md:min-h-0">
      {title}
      <ArrowUpRight
        className="size-3.5 text-ink-2 transition-[color,translate] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </Link>
  ) : (
    title
  );
  return (
    <section id={id} aria-labelledby={`${id}-h`} data-sec="" className={`frame pt-12 md:pt-20 ${className}`}>
      <div className="border-t border-line pt-6 md:pt-8">
        <h2 id={`${id}-h`} className="m-0 text-section font-[450] leading-[1.1] tracking-[-0.01em]">
          {word}
        </h2>
        {sub ? <p className="mb-0 mt-3 max-w-(--span-6) text-body text-ink-2">{sub}</p> : null}
      </div>
      <div className="mt-7 md:mt-10">{children}</div>
    </section>
  );
}
