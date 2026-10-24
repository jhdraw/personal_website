#!/usr/bin/env node
/**
 * One-time helper: gets your Spotify REFRESH TOKEN.
 *
 * 1. Create an app at https://developer.spotify.com/dashboard
 * 2. In the app settings, add this Redirect URI:
 *      http://127.0.0.1:8888/callback
 * 3. Run:
 *      SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-token.mjs
 *    (on Windows PowerShell:
 *      $env:SPOTIFY_CLIENT_ID="xxx"; $env:SPOTIFY_CLIENT_SECRET="yyy"; node scripts/spotify-token.mjs )
 * 4. A browser opens -> approve -> the refresh token prints here.
 * 5. Put it in .env.local / Vercel as SPOTIFY_REFRESH_TOKEN.
 */
import http from "node:http";
import { exec } from "node:child_process";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-recently-played";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars first.");
  process.exit(1);
}

const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT,
  });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:8888");
  if (url.pathname !== "/callback") return res.end();

  const code = url.searchParams.get("code");
  if (!code) {
    res.end("No code received. Try again.");
    return;
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
    }),
  });
  const json = await tokenRes.json();

  if (json.refresh_token) {
    console.log("\n✔ SUCCESS! Add this to your env vars:\n");
    console.log(`SPOTIFY_REFRESH_TOKEN=${json.refresh_token}\n`);
    res.end("Done! Check your terminal for the refresh token. You can close this tab.");
  } else {
    console.error("Failed:", json);
    res.end("Something went wrong — check the terminal.");
  }
  server.close();
});

server.listen(8888, () => {
  console.log("Opening Spotify consent page…\nIf it doesn't open, visit:\n" + authUrl);
  const opener =
    process.platform === "win32" ? "start \"\"" : process.platform === "darwin" ? "open" : "xdg-open";
  exec(`${opener} "${authUrl}"`);
});
