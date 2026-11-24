import Link from "next/link";
import { GROUPS } from "@/lib/pages";
import s from "./ReadingFrame.module.css";

/**
 * A reading page on tickerz.com's docs frame: from 1100px the site's groups on columns 1 to 3, the page on 4 to 9 and
 * "On this page" on 10 to 12, each side held in view while the page scrolls. Under 1100px the page alone, full width.
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
    <div className={`wrap ${s.frame}`}>
      <nav aria-label="site" className={s.side}>
        {GROUPS.map((g) => (
          <div key={g.label} className={s.group}>
            <p className={s.label}>{g.label}</p>
            <ul>
              {g.links.map(([href, label]) => (
                <li key={href}>
                  {href.startsWith("/") && !href.includes(".") ? (
                    <Link href={href} aria-current={href === here ? "page" : undefined}>
                      {label}
                    </Link>
                  ) : (
                    <a href={href}>{label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className={s.main}>{children}</div>
      {toc && toc.length ? (
        <nav aria-label="on this page" className={s.toc}>
          <p className={s.tocLabel}>On this page</p>
          <ul>
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
