import Link from "next/link";
import { GROUPS } from "@/lib/pages";

const SIDE_LINK = "flex min-h-7 items-center text-small text-ink-2 no-underline transition-colors hover:text-ink aria-[current=page]:text-ink";

/**
 * A reading page on tickerz.com's docs frame: from 1100px the site's groups on columns 1 to 3 with a hairline down
 * their right, the page on 4 to 9, and "On this page" on 10 to 12 with a hairline on its left, both sides held below the
 * bar while the page scrolls. Under 1100px the page alone, full width.
 */
export default function ReadingFrame({
  here,
  toc,
  children,
}: {
  /** The page's own path, marked in the side list. */
  here: string;
  /** The page's sections: [id, label]. */
  toc?: [string, string][];
  children: React.ReactNode;
}) {
  return (
    <div className="frame lg:grid-page">
      <nav
        aria-label="site"
        className="sticky top-16 hidden max-h-[calc(100dvh-4rem)] self-start overflow-y-auto border-r border-line py-12 lg:col-span-3 lg:block"
      >
        {GROUPS.map((g) => (
          <div key={g.label} className="mb-8 last:mb-0">
            <p className="mb-2 mt-0 text-lede font-medium leading-tight text-ink">{g.label}</p>
            <ul className="m-0 list-none p-0">
              {g.links.map(([href, label]) => (
                <li key={href}>
                  {href.startsWith("/") && !href.includes(".") ? (
                    <Link href={href} className={SIDE_LINK} aria-current={href === here ? "page" : undefined}>
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className={SIDE_LINK}>
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="min-w-0 lg:col-span-6">{children}</div>
      {toc && toc.length ? (
        <nav aria-label="on this page" className="sticky top-28 mt-12 hidden self-start border-l border-line pl-4 lg:col-span-3 lg:block">
          <p className="mb-2 mt-0 text-small font-medium text-ink">On this page</p>
          <ul className="m-0 list-none p-0">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={SIDE_LINK}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
