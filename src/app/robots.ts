import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Served at /robots.txt. The polite layer of scraper defense: reputable
// crawlers (search engines, well-behaved AI bots) honour this; malicious
// scrapers ignore it — the user-agent block in src/proxy.ts is the teeth.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Normal visitors + search engines: index public pages, keep them
        // out of the admin area and API routes.
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/login"],
      },
      {
        // AI training / aggressive scraping bots: stay out entirely.
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "CCBot",
          "ClaudeBot",
          "anthropic-ai",
          "Claude-Web",
          "Google-Extended",
          "PerplexityBot",
          "Bytespider",
          "Amazonbot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
