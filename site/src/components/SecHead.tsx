import Link from "next/link";

/** Tickerz's arrow out of a section heading: up and to the right, 14px, in the second text tone. */
export function Arrow() {
  return (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 10 10 4M5 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A section's heading, as tickerz.com's home sets them (tk-sec): a hairline above (from .sec), the name of the
 * page it leads to at 32px with the arrow, and one line under it. No href: the name alone.
 */
export default function SecHead({
  id,
  href,
  children,
  sub,
}: {
  id: string;
  href?: string;
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  const inner = href ? (
    href.startsWith("/") ? (
      <Link href={href}>
        {children}
        <Arrow />
      </Link>
    ) : (
      <a href={href}>
        {children}
        <Arrow />
      </a>
    )
  ) : (
    children
  );
  return (
    <>
      <h2 id={id} className="sec-h">
        {inner}
      </h2>
      {sub ? <p className="sec-sub">{sub}</p> : null}
    </>
  );
}
