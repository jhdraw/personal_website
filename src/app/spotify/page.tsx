import { supabaseServer } from "@/lib/supabase/server";
import NowPlaying from "@/components/NowPlaying";
import {
  normalizeStored,
  spotifyEmbedSrc,
  spotifyEmbedHeight,
  type SpotifyEmbed,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

export const metadata = { title: "Spotify — Qian Hui" };

async function getEmbeds(): Promise<SpotifyEmbed[]> {
  try {
    const supabase = await supabaseServer();
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "spotify_playlists")
      .maybeSingle();
    return normalizeStored(data?.value);
  } catch {
    return [];
  }
}

export default async function SpotifyPage() {
  const playlists = await getEmbeds();

  return (
    <div>
      <h1 className="sticker mb-8 bg-lime text-3xl sm:text-4xl">
        SPOTIFY
      </h1>

      <section>
        <h2 className="mb-4 text-2xl">Live activity</h2>
        <NowPlaying showRecent />
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-2xl">Music</h2>
        {playlists.length === 0 ? (
          <div className="brutal bg-paper p-6">
            <p className="font-bold">
              Nothing added yet — paste Spotify links in{" "}
              <code>/admin/settings</code>.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {playlists.map((e) => (
              <div key={`${e.type}-${e.id}`} className="brutal bg-paper p-2">
                <iframe
                  src={spotifyEmbedSrc(e)}
                  width="100%"
                  height={spotifyEmbedHeight(e)}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title={`Spotify ${e.type} ${e.id}`}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
