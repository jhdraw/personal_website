"use client";

import { useEffect, useState } from "react";

type Track = {
  title: string;
  artist: string;
  album: string;
  image: string | null;
  url: string;
};

type NowPlayingData = {
  configured: boolean;
  playing: boolean;
  track: Track | null;
  recent: Track[];
};

export default function NowPlaying({ showRecent = false }: { showRecent?: boolean }) {
  const [data, setData] = useState<NowPlayingData | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/spotify/now-playing")
        .then((r) => r.json())
        .then((d) => alive && setData(d))
        .catch(() => alive && setData(null));
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data || !data.configured) {
    return (
      <div className="brutal bg-paper p-5">
        <p className="font-bold">
          🎧 Spotify isn&apos;t connected yet
          {data && !data.configured ? " — set the SPOTIFY_* env vars." : "…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <a
        href={data.track?.url ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="brutal flex items-center gap-4 bg-paper p-4 transition-transform hover:-translate-y-0.5"
      >
        {data.track?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.track.image}
            alt=""
            className="h-16 w-16 border-3 border-ink object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center border-3 border-ink bg-grape text-2xl">
            ♪
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider">
            {data.playing ? (
              <span className="bg-lime px-1">▶ now playing</span>
            ) : (
              <span className="bg-sky px-1">last played</span>
            )}
          </p>
          <p className="truncate text-lg font-bold">{data.track?.title ?? "Nothing yet"}</p>
          <p className="truncate">{data.track?.artist}</p>
        </div>
      </a>

      {showRecent && data.recent.length > 0 && (
        <div className="brutal bg-paper p-4">
          <p className="mb-2 font-display">RECENTLY PLAYED</p>
          <ol className="flex flex-col gap-1">
            {data.recent.map((t, i) => (
              <li key={i} className="truncate">
                <a href={t.url} target="_blank" rel="noreferrer" className="hover:underline">
                  <span className="font-bold">{t.title}</span> — {t.artist}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
