# Personal Website — Qian Hui

A personal site in a retro pixel / old-desktop style: skills, a Markdown blog,
photo albums, a resume download, live Spotify activity and anonymous Q&A. All of
it is editable from a built-in admin panel. Only two Google accounts can open
that panel: `jqianhuii@gmail.com` and `zhengxianyap@gmail.com`.

**Stack:** Next.js 16 (App Router) · Tailwind v4 · Supabase (Postgres + Auth) · Cloudflare R2 · Vercel
**Cost:** $0/month on free tiers. All accounts below should be **Qian Hui's own**,
so the free quotas aren't shared with another site.

---

## Setup (one time)

### 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and run it.
   This creates every table and its Row Level Security rules.
   > The two admin emails are listed in the `is_owner()` function. To change who
   > can edit the site, update them there **and** in `NEXT_PUBLIC_OWNER_EMAILS`.

### 2. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com) (any Google account,
   no billing needed), create a new project.
2. **APIs & Services → OAuth consent screen**: choose "External", fill in the app
   name, and add both admin emails as **Test users**. It can stay in "Testing"
   mode, because only the admins ever sign in.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type
   "Web application". Under **Authorized redirect URIs** add
   `https://<your-project-ref>.supabase.co/auth/v1/callback`.
4. In Supabase: **Authentication → Sign In / Providers → Google**. Enable it and
   paste the Client ID and Client Secret.
5. Still in **Authentication**, disable email sign-ups so only Google works.
6. **Authentication → URL Configuration**: set **Site URL** to the deployed URL
   and add these to **Redirect URLs**: `http://localhost:3000/**` and
   `https://<your-site>.vercel.app/**`.

Anyone can technically sign in with Google, but the database rules and the
`/admin` guard only give edit access to the two admin emails. Everyone else is
sent back to `/login`.

### 3. Environment variables

```
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`: **Project Settings → Data API**, the "Project URL".
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: **Project Settings → API Keys**, the
  **Publishable key**. It's safe to expose because the database rules guard the data.

> Never use the **Secret key** here. It bypasses Row Level Security.

### 4. File storage: Cloudflare R2

Photos, videos, blog images and the resume are stored in R2 (10 GB free, no
download fees).

1. Cloudflare → **R2** → create a bucket, e.g. `qianhui-personal-website`.
2. Bucket → **Settings → Public Access → R2.dev subdomain → Allow**. Copy the
   public URL (`https://pub-xxxx.r2.dev`) into `NEXT_PUBLIC_R2_PUBLIC_URL`.
3. **R2 → Manage API Tokens → Create** with **Object Read & Write** on that
   bucket. Copy the Access Key ID, Secret Access Key and Account ID into the
   `R2_*` variables.
4. Bucket → **Settings → CORS Policy**, paste (replace the Vercel URL):
   ```json
   [
     {
       "AllowedOrigins": ["http://localhost:3000", "https://<your-site>.vercel.app"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Every domain the admins upload from must be listed, or uploads fail.

### 5. Spotify (now-playing widget)

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
   with the Spotify account whose listening you want to show.
2. Add redirect URI `http://127.0.0.1:8888/callback` in the app settings.
3. Run the helper and approve in the browser (PowerShell):
   ```powershell
   $env:SPOTIFY_CLIENT_ID="<client id>"; $env:SPOTIFY_CLIENT_SECRET="<client secret>"; node scripts/spotify-token.mjs
   ```
4. Copy the printed `SPOTIFY_REFRESH_TOKEN`, plus the ID and secret, into `.env.local`.
5. Playlists need no API. Paste playlist links in **Admin → Settings**.

### 6. GIPHY (GIFs in Q&A answers)

Create an app at [developers.giphy.com](https://developers.giphy.com) and put
the API key in `GIPHY_API_KEY`.

### 7. Run locally

```
npm install
npm run dev
```

Visit http://localhost:3000, sign in via the "admin login" link in the footer,
then fill in the profile, skills, resume, posts and albums at `/admin`.

### 8. Deploy to Vercel (free)

1. Push this folder to a GitHub repo.
2. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo →
   add every variable from `.env.local` → Deploy.
3. Add the `*.vercel.app` URL to Supabase **URL Configuration** (step 2.6) and to
   the R2 CORS list (step 4.4).
4. After changing any Vercel env var, redeploy for it to take effect.

> **Keep-alive:** free Supabase projects pause after about 7 days with no traffic.
> A free uptime ping (e.g. cron-job.org hitting the homepage daily) prevents that.

---

## Theme colors

**Admin → Settings → Theme colors** has a color picker for each part of the
palette (page background, grid, windows, outlines/text and six accents).
Changes preview live and apply to every visitor once saved. "Reset to default"
brings back the original pastel palette.

## Where things live

| What | Where |
|---|---|
| Admin email allow-list | `src/lib/owner.ts` + `is_owner()` in `supabase/schema.sql` |
| Admin route guard | `src/proxy.ts` (edge) + `src/app/admin/layout.tsx` (server) |
| Pixel theme (default colors, windows, buttons) | `src/app/globals.css` |
| Editable theme colors | `src/lib/theme.ts`, saved in `site_settings.theme` |
| Window title bar / pixel icons | `src/components/WindowBar.tsx`, `src/components/PixelIcon.tsx` |
| Image download deterrence + watermark | `src/components/ProtectedImage.tsx`, `src/lib/watermark.ts` |
| Spotify now-playing API | `src/app/api/spotify/now-playing/route.ts` |

## Image protection: honest limits

Right-click, drag-save and mobile long-press are blocked, and uploads are
watermarked. A determined visitor can still take a screenshot; no website can
prevent that.
