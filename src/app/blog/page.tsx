import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Blog — Qian Hui" };

async function getPosts(): Promise<Post[]> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("posts")
      .select("id, slug, title, excerpt, created_at, published, content_md, cover_image, updated_at")
      .eq("published", true)
      .order("created_at", { ascending: false });
    return (data ?? []) as Post[];
  } catch {
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div>
      <h1 className="sticker mb-8 bg-bubble text-3xl sm:text-4xl">
        BLOG
      </h1>
      {posts.length === 0 ? (
        <div className="brutal bg-paper p-6">
          <p className="font-bold">Nothing published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className={`brutal block p-6 transition-transform hover:-translate-y-1 ${
                ["bg-paper", "bg-yolk", "bg-sky"][i % 3]
              }`}
            >
              <p className="text-sm font-bold uppercase">
                {new Date(post.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h2 className="mt-1 text-2xl">{post.title}</h2>
              {post.excerpt && <p className="mt-2">{post.excerpt}</p>}
              <p className="mt-3 font-bold underline decoration-2 underline-offset-4">
                Read more →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
