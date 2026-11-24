import { GROUPS } from "@/lib/pages";

const LINK = "flex min-h-11 items-center text-small text-ink no-underline transition-colors hover:text-ink-2 sm:min-h-8";

/**
 * The foot of every reading page, as tickerz.com's (v2-foot): 80px of space, a hairline, the site's groups 32px under
 * it with 12px mono labels (four across from 900px, two under it, one when large text needs it), then the legal line.
 * The groups are the side list of every reading page too (src/lib/pages.ts), so the two never disagree.
 */
export default function Footer() {
  return (
    <footer className="frame mt-12 pb-10 md:mt-20">
      <nav aria-label="footer" className="grid grid-cols-[repeat(auto-fit,minmax(min(9rem,100%),1fr))] gap-x-4 gap-y-8 border-t border-line pt-8 md:grid-cols-4">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col items-start">
            <span className="mb-2 font-mono text-label tracking-wide text-ink-2">{g.label}</span>
            {g.links.map(([href, label]) => (
              <a key={href} href={href} className={LINK}>
                {label}
              </a>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line pt-4 font-mono text-label tracking-wide text-ink-2">
        <span className="font-bold text-ink">
          typeshi <span className="ml-2 font-normal text-ink-3">lock in fn.</span>
        </span>
        <span>MIT</span>
        <span>Not affiliated with TypeScript or Microsoft</span>
        <span>Not financial advice</span>
        <span>
          A{" "}
          <a href="https://tickerz.com" className="text-ink pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center">
            Tickerz
          </a>{" "}
          project
        </span>
        <span className="text-ink-3 md:ml-auto">wen moon? soon™</span>
      </div>
    </footer>
  );
}
