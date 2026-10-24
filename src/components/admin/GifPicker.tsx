"use client";

import { useEffect, useState } from "react";

type Gif = { id: string; title: string; url: string; preview: string };

export default function GifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounced so typing a search doesn't spend one API call per keystroke.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/giphy?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error ?? "Search failed");
          setGifs([]);
        } else {
          setError(null);
          setGifs(json.gifs as Gif[]);
        }
      } catch {
        if (!cancelled) setError("Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <div className="brutal mt-3 bg-paper p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIPHY…"
          className="brutal-sm flex-1 bg-paper px-3 py-1"
        />
        <button onClick={onClose} className="brutal-btn bg-paper px-3 py-1 text-sm">
          CLOSE
        </button>
      </div>

      {error && (
        <p className="sticker mt-3 inline-block bg-tangerine text-sm">{error}</p>
      )}

      {loading ? (
        <p className="mt-3 font-bold">Loading GIFs…</p>
      ) : gifs.length === 0 && !error ? (
        <p className="mt-3 font-bold opacity-60">No GIFs found.</p>
      ) : (
        <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4">
          {gifs.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onPick(g.url)}
              title={g.title || "Use this GIF"}
              className="brutal-sm overflow-hidden bg-paper hover:-translate-y-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.preview}
                alt={g.title || "GIF"}
                loading="lazy"
                className="h-24 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs font-bold opacity-60">Powered by GIPHY</p>
    </div>
  );
}
