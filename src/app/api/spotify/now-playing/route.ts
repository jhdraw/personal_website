import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENT_URL = "https://api.spotify.com/v1/me/player/recently-played?limit=5";

type SpotifyTrack = {
  name: string;
  external_urls: { spotify: string };
  album: { name: string; images: { url: string }[] };
  artists: { name: string }[];
};

function toTrack(item: SpotifyTrack) {
  return {
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    image: item.album.images.at(-1)?.url ?? item.album.images[0]?.url ?? null,
    url: item.external_urls.spotify,
  };
}

async function getAccessToken(id: string, secret: string, refresh: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

export async function GET() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!id || !secret || !refresh) {
    return NextResponse.json({
      configured: false,
      playing: false,
      track: null,
      recent: [],
    });
  }

  try {
    const token = await getAccessToken(id, secret, refresh);
    const auth = { Authorization: `Bearer ${token}` };

    const [nowRes, recentRes] = await Promise.all([
      fetch(NOW_PLAYING_URL, { headers: auth, cache: "no-store" }),
      fetch(RECENT_URL, { headers: auth, cache: "no-store" }),
    ]);

    let playing = false;
    let track = null;

    if (nowRes.status === 200) {
      const now = await nowRes.json();
      if (now?.item) {
        playing = now.is_playing === true;
        track = toTrack(now.item);
      }
    }

    let recent: ReturnType<typeof toTrack>[] = [];
    if (recentRes.ok) {
      const json = await recentRes.json();
      recent = (json.items ?? []).map((i: { track: SpotifyTrack }) =>
        toTrack(i.track)
      );
    }

    // Nothing playing right now -> fall back to most recent track.
    if (!track && recent.length > 0) track = recent[0];

    return NextResponse.json(
      { configured: true, playing, track, recent },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch {
    return NextResponse.json({
      configured: true,
      playing: false,
      track: null,
      recent: [],
    });
  }
}
