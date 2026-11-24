import { GROUPS } from "@/lib/pages";
import s from "./Footer.module.css";

/**
 * The foot of every reading page, as tickerz.com's: a hairline, the site's groups of links under a small mono label
 * (four across, two on a phone), then the legal line. The groups are the side list of every reading page too
 * (src/lib/pages.ts), so the two never disagree.
 */
export default function Footer() {
  return (
    <footer className={`wrap ${s.footer}`}>
      <nav aria-label="footer" className={s.cols}>
        {GROUPS.map((g) => (
          <div key={g.label} className={s.group}>
            <span className={s.label}>{g.label}</span>
            {g.links.map(([href, label]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className={s.legal}>
        <span className={s.word}>
          typeshi <span>lock in fn.</span>
        </span>
        <span>MIT</span>
        <span>Not affiliated with TypeScript or Microsoft</span>
        <span>Not financial advice</span>
        <span>
          A <a href="https://tickerz.com">Tickerz</a> project
        </span>
        <span className={s.moon}>wen moon? soon™</span>
      </div>
    </footer>
  );
}
