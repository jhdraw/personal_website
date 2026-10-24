import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/storage";
import MarkdownView from "@/components/MarkdownView";
import ProtectedImage from "@/components/ProtectedImage";
import type { Post } from "@/lib/types";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";
import { isOwnerEmail } from "@/lib/owner";
import ExportPdfButton from "@/components/ExportPdfButton";

export const dynamic = "force-dynamic";

// The export button is a convenience for the owner, not a secret: the post is
// already public, so this only decides whether the control is rendered.
async function isOwner(): Promise<boolean> {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return isOwnerEmail(user?.email);
  } catch {
    return false;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Every save stamps updated_at, so most posts have one even if they were never
// meaningfully revised. Only surface it when it lands on a different day than
// the publish date — otherwise the line just repeats the date above it.
function wasEdited(post: Post) {
  if (!post.updated_at) return false;
  return formatDate(post.updated_at) !== formatDate(post.created_at);
}

async function getPost(slug: string): Promise<Post | null> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    return data as Post | null;
  } catch {
    return null;
  }
}

// Without this every post inherits the site-wide title/description, so search
// results can't tell them apart.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: `Post not found — ${SITE_NAME}` };

  const description =
    post.excerpt?.trim() ||
    post.content_md.replace(/[#*`>_~\-[\]()!]/g, " ").replace(/\s+/g, " ").trim().slice(0, 155);

  return {
    title: `${post.title} — ${SITE_NAME}`,
    description,
    // The owner can keep a published post out of search results; it stays
    // readable to anyone with the link.
    // Compared against false explicitly: if the column is missing the value is
    // undefined, and the safe default is to stay indexable.
    robots:
      post.indexable === false
        ? { index: false, follow: false, googleBot: { index: false, follow: false } }
        : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      images: post.cover_image ? [imageUrl(post.cover_image)] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [post, owner] = await Promise.all([getPost(slug), isOwner()]);

  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Link href="/blog" className="brutal-btn inline-block bg-paper px-3 py-1 text-sm">
          ← ALL POSTS
        </Link>
        {owner && <ExportPdfButton title={post.title} />}
      </div>
      <h1 className="mt-6 text-3xl leading-tight sm:text-5xl">{post.title}</h1>
      <p className="mt-3 inline-block bg-yolk px-2 py-0.5 font-bold">
        <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
      </p>
      {wasEdited(post) && (
        <p className="mt-2 text-sm font-bold opacity-70">
          Last updated{" "}
          <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
        </p>
      )}
      {post.cover_image && (
        <ProtectedImage
          src={imageUrl(post.cover_image)}
          alt={post.title}
          className="brutal mt-6 max-h-[60vh] w-full"
        />
      )}
      <div className="mt-6">
        <MarkdownView content={post.content_md} />
      </div>
    </article>
  );
}
