import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/storage";
import { parseEmbed } from "@/lib/embed";
import ProtectedImage from "@/components/ProtectedImage";
import ProtectedVideo from "@/components/ProtectedVideo";
import { sortAlbumImages, type Album } from "@/lib/types";
import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("albums")
      .select("title, description, slug")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) return { title: `Album not found — ${SITE_NAME}` };
    const description =
      data.description?.trim() || `Photos from ${data.title}.`;
    return {
      title: `${data.title} — ${SITE_NAME}`,
      description,
      alternates: { canonical: `/albums/${data.slug}` },
      openGraph: {
        type: "article",
        title: data.title,
        description,
        url: `/albums/${data.slug}`,
      },
    };
  } catch {
    return { title: `Albums — ${SITE_NAME}` };
  }
}

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let album: Album | null = null;
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("albums")
      .select(
        "*, album_images(id, album_id, storage_path, caption, sort_order, media_type, embed_url, taken_at, created_at)"
      )
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    album = data as Album | null;
  } catch {
    album = null;
  }

  if (!album) notFound();

  const images = sortAlbumImages(album.album_images ?? [], album.sort_mode);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/albums" className="brutal-btn inline-block bg-paper px-3 py-1 text-sm">
        ← ALL ALBUMS
      </Link>
      <h1 className="mt-6 text-3xl sm:text-5xl">{album.title}</h1>
      {album.description && (
        <p className="brutal-sm mt-4 inline-block bg-yolk px-3 py-2 text-lg">
          {album.description}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-10">
        {images.map((img, i) => {
          const embed = img.media_type === "embed" && img.embed_url
            ? parseEmbed(img.embed_url)
            : null;
          return (
            <figure key={img.id} className="flex w-full flex-col items-center">
              {embed ? (
                <div className="brutal aspect-video w-full bg-ink">
                  <iframe
                    src={embed.embedSrc}
                    title={img.caption ?? `${album.title} video ${i + 1}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : img.media_type === "video" && img.storage_path ? (
                <ProtectedVideo
                  src={imageUrl(img.storage_path)}
                  className="brutal max-h-[80vh] w-full bg-ink"
                />
              ) : img.storage_path ? (
                <ProtectedImage
                  fit="contain"
                  src={imageUrl(img.storage_path)}
                  alt={img.caption ?? `${album.title} photo ${i + 1}`}
                  className="brutal max-h-[80vh] bg-ink"
                />
              ) : null}
              {img.caption && (
                <figcaption className="brutal-sm mt-3 inline-block bg-paper px-3 py-1 font-bold">
                  {img.caption}
                </figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
