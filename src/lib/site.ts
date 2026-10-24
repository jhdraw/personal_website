// Single source of truth for the site's public address, used by metadata,
// the sitemap, and the canonical-host redirect in src/proxy.ts. On Vercel the
// production domain (e.g. <project>.vercel.app) is picked up automatically;
// set NEXT_PUBLIC_SITE_HOST to override it, e.g. for a custom domain.
export const SITE_HOST =
  process.env.NEXT_PUBLIC_SITE_HOST ||
  process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  "localhost:3000";

export const SITE_URL = `${SITE_HOST.startsWith("localhost") ? "http" : "https"}://${SITE_HOST}`;

export const SITE_NAME = "Qian Hui";

export const SITE_DESCRIPTION =
  "Personal website of Qian Hui — skills, blog, photo albums and what I'm listening to.";
