import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAlbumsPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("albums")
    .select("id, title, published, created_at, album_images(id)")
    .order("created_at", { ascending: false });
  const albums = data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl">Albums</h1>
        <Link href="/admin/albums/new" className="brutal-btn bg-yolk px-4 py-2">
          + NEW ALBUM
        </Link>
      </div>
      {albums.length === 0 ? (
        <div className="brutal bg-paper p-6 font-bold">No albums yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {albums.map((album) => (
            <Link
              key={album.id}
              href={`/admin/albums/${album.id}`}
              className="brutal-sm flex flex-wrap items-center gap-3 bg-paper p-4 hover:-translate-y-0.5"
            >
              <span
                className={`sticker text-xs ${album.published ? "bg-lime" : "bg-tangerine"}`}
              >
                {album.published ? "LIVE" : "DRAFT"}
              </span>
              <span className="font-bold">{album.title}</span>
              <span className="ml-auto text-sm">
                {(album.album_images ?? []).length} photos
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
