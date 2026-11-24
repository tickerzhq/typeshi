/** The address the site claims for itself: a subdomain of Tickerz, which makes it. */
export const SITE = "https://typeshi.tickerz.com";

/**
 * The absolute address for links that leave the page (link previews, canonical links, the sitemap,
 * llms.txt). NEXT_PUBLIC_SITE_URL wins, then the production address Vercel sets at build time, so
 * a link preview's og:image always points at a deploy that has it.
 */
export function siteUrl(): string {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return process.env.NEXT_PUBLIC_SITE_URL ?? (production ? `https://${production}` : SITE);
}
