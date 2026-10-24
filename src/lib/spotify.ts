// Parses any Spotify share link / URI into an embeddable {type, id}.
// Supports playlists, albums, tracks, artists, shows, and episodes.

export type SpotifyEmbed = { type: string; id: string };

const TYPES = "playlist|album|track|artist|show|episode";

export function parseSpotifyEntry(line: string): SpotifyEmbed | null {
  const s = line.trim();
  if (!s) return null;

  let m = s.match(new RegExp(`open\\.spotify\\.com/(${TYPES})/([a-zA-Z0-9]+)`));
  if (m) return { type: m[1], id: m[2] };

  m = s.match(new RegExp(`spotify:(${TYPES}):([a-zA-Z0-9]+)`));
  if (m) return { type: m[1], id: m[2] };

  // A bare ID with no type -> assume a playlist.
  m = s.match(/^([a-zA-Z0-9]{16,})$/);
  if (m) return { type: "playlist", id: m[1] };

  return null;
}

// Stored values used to be bare playlist-ID strings; accept both the old and
// new shapes so existing data keeps working.
export function normalizeStored(value: unknown): SpotifyEmbed[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v): SpotifyEmbed | null =>
      typeof v === "string"
        ? { type: "playlist", id: v }
        : v && typeof v === "object" && "id" in v
        ? (v as SpotifyEmbed)
        : null
    )
    .filter((e): e is SpotifyEmbed => Boolean(e?.id));
}

export function spotifyEmbedSrc(e: SpotifyEmbed) {
  return `https://open.spotify.com/embed/${e.type}/${e.id}?theme=0`;
}

export function spotifyEmbedHeight(e: SpotifyEmbed) {
  return e.type === "track" || e.type === "episode" ? 152 : 380;
}

export function spotifyEntryToLine(e: SpotifyEmbed) {
  return `https://open.spotify.com/${e.type}/${e.id}`;
}
