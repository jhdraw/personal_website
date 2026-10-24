import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

// Queries the DB, so it must not be cached — a new post should show up in the
// sitemap as soon as it's published.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/albums`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/qna`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/spotify`, changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const supabase = await supabaseServer();
    const [postsRes, albumsRes] = await Promise.all([
      supabase
        .from("posts")
        .select("slug, updated_at, created_at")
        .eq("published", true)
        .eq("indexable", true),
      supabase.from("albums").select("slug, created_at").eq("published", true),
    ]);

    const posts: MetadataRoute.Sitemap = (postsRes.data ?? []).map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated_at ?? p.created_at),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    const albums: MetadataRoute.Sitemap = (albumsRes.data ?? []).map((a) => ({
      url: `${SITE_URL}/albums/${a.slug}`,
      lastModified: new Date(a.created_at),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...posts, ...albums];
  } catch {
    // A DB hiccup shouldn't produce an empty sitemap.
    return staticRoutes;
  }
}
