import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("posts")
    .select("id, title, slug, published, created_at")
    .order("created_at", { ascending: false });
  const posts = (data ?? []) as Pick<
    Post,
    "id" | "title" | "slug" | "published" | "created_at"
  >[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Posts</h1>
        <Link href="/admin/posts/new" className="brutal-btn bg-yolk px-4 py-2">
          + NEW POST
        </Link>
      </div>
      {posts.length === 0 ? (
        <div className="brutal bg-paper p-6 font-bold">No posts yet — write your first one!</div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/admin/posts/${post.id}`}
              className="brutal-sm flex flex-wrap items-center gap-3 bg-paper p-4 hover:-translate-y-0.5"
            >
              <span
                className={`sticker text-xs ${post.published ? "bg-lime" : "bg-tangerine"}`}
              >
                {post.published ? "LIVE" : "DRAFT"}
              </span>
              <span className="font-bold">{post.title}</span>
              <span className="ml-auto text-sm">
                {new Date(post.created_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
