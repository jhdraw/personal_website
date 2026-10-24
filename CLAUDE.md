# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js 16 (App Router) — not the version you know

This repo runs **Next.js 16** with **Turbopack**. APIs and conventions differ from older Next.js; read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code. Notably:
- Edge middleware lives in **`src/proxy.ts`** (the old `middleware.ts` convention is deprecated — the exported function is `proxy`, not `middleware`).
- Route handler `params`/`searchParams` are **Promises** and must be `await`ed.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000 (Turbopack)
npm run build    # production build — also runs full type-check; use to verify changes
npm run lint     # ESLint (eslint-config-next)
```

There is **no test suite**. Verify changes with `npm run build` (type-check) + `npm run lint`. The public site is mostly DB/auth-gated, so curling the running dev server or production URL (checking status codes and rendered HTML) is the practical way to verify.

One-time helper script (run locally with env vars in `.env.local`):
```bash
node scripts/spotify-token.mjs   # obtain SPOTIFY_REFRESH_TOKEN
```

## Architecture

Qian Hui's personal website (retro pixel theme): public pages + an admin panel for two admins. Hosted on Qian Hui's own accounts. Next.js 16 on Vercel, Supabase for Postgres/Auth, Cloudflare R2 for files.

### Admin-only access — enforced in three layers
The whole admin model hinges on **an email allow-list** (`OWNER_EMAILS` / `isOwnerEmail()` in `src/lib/owner.ts`, overridable via `NEXT_PUBLIC_OWNER_EMAILS`, mirrored in SQL `is_owner()`): `jqianhuii@gmail.com`, `zhengxianyap@gmail.com`. Access is gated at three independent points; **Postgres RLS is the real security boundary** — the others are UX/defense-in-depth:
1. `src/proxy.ts` — edge check redirects non-owner sessions away from `/admin`. Also blocks scraper user-agents.
2. `src/app/admin/layout.tsx` — server-side re-check.
3. `supabase/schema.sql` `is_owner()` — RLS policies on every table; public can only read published rows / public settings.

### Auth (Supabase + Google OAuth) — production-specific quirks
- Browser client `src/lib/supabase/client.ts`, server client `src/lib/supabase/server.ts` (`@supabase/ssr`).
- `src/app/auth/callback/route.ts` exchanges the OAuth code and **must write session cookies onto the redirect response object** (not via `next/headers`) — otherwise login works in dev but bounces to `/login` on Vercel serverless.
- The home page (`src/app/page.tsx`) forwards a stray `?code=` to `/auth/callback`, because Supabase falls back to the Site URL when its redirect-allow-list doesn't match.

### File storage is Cloudflare R2, not Supabase Storage
- Public read URLs are built from `NEXT_PUBLIC_R2_PUBLIC_URL` in `src/lib/storage.ts` (`imageUrl`, `resumeUrl`). Object keys: `albums/<id>/…`, `posts/…`, `resume.pdf`.
- Uploads go **browser → R2 directly** via a presigned URL: client helpers in `src/lib/upload.ts` call the **owner-gated** `src/app/api/r2/route.ts` (presign PUT/GET, delete), which uses the server-only S3 client in `src/lib/r2.ts`. This keeps secrets server-side and lets large videos bypass Vercel's request-size limit.
- R2 **bucket CORS** must list every origin that uploads (localhost + each deployed domain) or browser PUTs fail.

### Data model (`supabase/schema.sql`)
`posts`, `albums` + `album_images` (`media_type` = image | video | embed; `embed_url` for YouTube/Vimeo; nullable `storage_path` for embeds), `skills`, `connections`, and `site_settings` (key/value `jsonb`: `profile`, `spotify_playlists`, `watermark`). `schema.sql` is the full, re-runnable schema for a fresh project. Put future incremental changes in `supabase/add-*.sql`; they **must be run in the Supabase SQL editor before deploying code that reads the new columns/tables**, or queries fail.

### Admin editors
Client components in `src/components/admin/` talk **directly to Supabase** for DB writes (RLS enforces owner-only) and to `/api/r2` for files. Image uploads are watermarked client-side before upload; the album rotate tool fetches via a presigned GET, re-encodes on a canvas, and re-uploads.

### Image protection (deterrence, not DRM)
`ProtectedImage` (`fit="cover"|"contain"`) and `ProtectedVideo` block right-click/drag/long-press and overlay the media. The stronger layer is `src/lib/watermark.ts`, which **bakes a watermark into the pixels at upload time**; its config (text/color/opacity/size/position/angle) lives in `site_settings.watermark`, is edited in `SettingsPanel`, and is loaded by uploads via the `useWatermarkConfig` hook. None of this stops screenshots.

### Theme & Spotify
- Retro pixel / old-desktop look: default color tokens and the `.brutal*` (window), `.brutal-btn` (notched pixel button), `.sticker`, `.win-bar`, `.pixel-progress` classes live in `src/app/globals.css` (Tailwind v4 `@theme`; class names kept from the original neo-brutalist theme). Fonts (Pixelify Sans, VT323 for mono) are wired via `next/font` in `src/app/layout.tsx`. `WindowBar` draws the "title  _ □ ×" bar; `PixelIcon` draws grid-defined pixel icons.
- Admin-editable colors: `src/lib/theme.ts` lists the tokens + defaults; the saved palette is `site_settings.theme`, read per request by `getTheme()` (`src/lib/theme-server.ts`) and written as `--color-*` inline vars on `<html>` by the root layout. Edited in `SettingsPanel` (live preview). Keep `theme.ts` defaults and `globals.css` `@theme` in sync.
- `src/app/api/spotify/now-playing/route.ts` refreshes the Spotify token server-side and returns current/recent tracks; the `NowPlaying` client widget polls it. Playlists are plain embeds (IDs in `site_settings.spotify_playlists`).

## Deployment
Push to `main` → Vercel auto-deploys **production**; feature branches get preview deployments. Production and previews share the **same Supabase DB and R2 bucket**. Required env vars (see `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_OWNER_EMAILS`, `SPOTIFY_*`, `GIPHY_API_KEY`, `R2_*`, `NEXT_PUBLIC_R2_PUBLIC_URL`. When changing a Vercel env var, redeploy for it to take effect — and verify long values (the anon key, R2 secret) aren't truncated on paste.
