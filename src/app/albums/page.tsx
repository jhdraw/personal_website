import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/storage";
import { parseEmbed } from "@/lib/embed";
import ProtectedImage from "@/components/ProtectedImage";
import { sortAlbumImages, type Album } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Albums — Qian Hui" };

async function getAlbums(): Promise<Album[]> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("albums")
      .select(
        "*, album_images(id, album_id, storage_path, caption, sort_order, media_type, embed_url, taken_at, created_at)"
      )
      .eq("published", true)
      .order("created_at", { ascending: false });
    return (data ?? []) as Album[];
  } catch {
    return [];
  }
}

export default async function AlbumsPage() {
  const albums = await getAlbums();

  return (
    <div>
      <h1 className="sticker mb-8 bg-sky text-3xl sm:text-4xl">
        ALBUMS
      </h1>
      {albums.length === 0 ? (
        <div className="brutal bg-paper p-6">
          <p className="font-bold">No albums published yet.</p>
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2">
          {albums.map((album) => {
            const cover = sortAlbumImages(
              album.album_images ?? [],
              album.sort_mode
            )[0];
            const coverEmbed =
              cover?.media_type === "embed" && cover.embed_url
                ? parseEmbed(cover.embed_url)
                : null;
            const count = (album.album_images ?? []).length;
            return (
              <Link
                key={album.id}
                href={`/albums/${album.slug}`}
                className="brutal block bg-paper transition-transform hover:-translate-y-1"
              >
                {coverEmbed?.thumbnail ? (
                  <div className="relative h-56 w-full border-b-3 border-ink">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverEmbed.thumbnail}
                      alt={album.title}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-4xl text-paper">
                      ▶
                    </span>
                  </div>
                ) : cover?.media_type === "video" && cover.storage_path ? (
                  <div className="relative h-56 w-full border-b-3 border-ink bg-ink">
                    <video
                      src={imageUrl(cover.storage_path)}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-4xl text-paper">
                      ▶
                    </span>
                  </div>
                ) : cover?.storage_path ? (
                  <ProtectedImage
                    src={imageUrl(cover.storage_path)}
                    alt={album.title}
                    className="h-56 w-full border-b-3 border-ink"
                  />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center border-b-3 border-ink bg-grape text-4xl">
                    {cover?.media_type === "embed" ? "▶" : "📷"}
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-xl">{album.title}</h2>
                  {album.description && (
                    <p className="mt-1 line-clamp-2">{album.description}</p>
                  )}
                  <p className="mt-2 text-sm font-bold">
                    {count} item{count === 1 ? "" : "s"} →
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
