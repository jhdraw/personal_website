import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const dynamic = "force-dynamic";

// GIPHY search is proxied so the API key stays server-side, and gated to the
// owner so visitors can't burn the key's hourly quota. Viewers never hit this
// route — published GIFs load straight from GIPHY's CDN.
async function requireOwner() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isOwnerEmail(user?.email);
}

type GiphyItem = {
  id: string;
  title?: string;
  images?: {
    fixed_height?: { url?: string };
    fixed_height_small?: { url?: string };
    fixed_width_downsampled?: { url?: string };
  };
};

export async function GET(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const key = process.env.GIPHY_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GIPHY_API_KEY is not set" },
      { status: 500 }
    );
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  const endpoint = new URL(
    q
      ? "https://api.giphy.com/v1/gifs/search"
      : "https://api.giphy.com/v1/gifs/trending"
  );
  endpoint.searchParams.set("api_key", key);
  endpoint.searchParams.set("limit", "24");
  endpoint.searchParams.set("rating", "pg-13");
  if (q) endpoint.searchParams.set("q", q);

  try {
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `GIPHY request failed (${res.status})` },
        { status: 502 }
      );
    }
    const json = (await res.json()) as { data?: GiphyItem[] };
    const gifs = (json.data ?? [])
      .map((g) => ({
        id: g.id,
        title: g.title ?? "",
        // Full-size for the answer, small one for the picker grid.
        url: g.images?.fixed_height?.url ?? "",
        preview:
          g.images?.fixed_height_small?.url ??
          g.images?.fixed_width_downsampled?.url ??
          g.images?.fixed_height?.url ??
          "",
      }))
      .filter((g) => g.url);
    return NextResponse.json({ gifs });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GIPHY request failed" },
      { status: 502 }
    );
  }
}
