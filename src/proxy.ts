import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isOwnerEmail } from "@/lib/owner";
import { SITE_HOST } from "@/lib/site";

// User-agent fragments of bots we don't want scraping/training on the site.
// NOTE: this is a deterrent, not a guarantee — user agents are trivially
// spoofed, so it only stops bots that honestly identify themselves. Search
// engines (Googlebot/Bingbot) are intentionally NOT listed so the site stays
// indexable.
const BLOCKED_BOTS = [
  "gptbot",
  "oai-searchbot",
  "chatgpt-user",
  "ccbot",
  "claudebot",
  "anthropic-ai",
  "claude-web",
  "google-extended",
  "perplexitybot",
  "bytespider",
  "amazonbot",
  "scrapy",
  "python-requests",
  "httrack",
  "semrushbot",
  "ahrefsbot",
  "mj12bot",
  "dotbot",
];

// Vercel gives every project three hostnames (the stable production alias, a
// `-git-<branch>-` alias, and an immutable per-deployment URL) and none of them
// can be removed. Sending the extras to the canonical host keeps one public URL,
// which also keeps Supabase's OAuth redirect allow-list happy. Preview
// deployments are left alone so feature branches stay browsable.
const CANONICAL_HOST = process.env.CANONICAL_HOST ?? SITE_HOST;

export default async function proxy(request: NextRequest) {
  if (process.env.VERCEL_ENV === "production") {
    const host = request.headers.get("host");
    if (host && host !== CANONICAL_HOST) {
      const target = request.nextUrl.clone();
      target.protocol = "https";
      target.host = CANONICAL_HOST;
      target.port = "";
      return NextResponse.redirect(target, 308);
    }
  }

  const ua = request.headers.get("user-agent")?.toLowerCase() ?? "";
  if (ua && BLOCKED_BOTS.some((bot) => ua.includes(bot))) {
    return new NextResponse("Not available to automated clients.", {
      status: 403,
    });
  }

  // Everything below is auth gating, which only matters for the admin area.
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // Run on all page routes (for bot blocking) but skip Next internals and
  // static asset files, so public pages pay only the cheap user-agent check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
