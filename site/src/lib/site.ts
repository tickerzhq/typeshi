/** The address the site claims for itself. typeshi.dev is the name it's built for. */
export const SITE = "https://typeshi.dev";

/**
 * The absolute address for links that leave the page (link previews, llms.txt). Until typeshi.dev
 * answers, it's this deploy's own production address, which Vercel sets at build time, so the
 * og:image a chat app fetches exists. NEXT_PUBLIC_SITE_URL overrides both.
 */
export function siteUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return process.env.NEXT_PUBLIC_SITE_URL ?? (production ? `https://${production}` : SITE);
}
