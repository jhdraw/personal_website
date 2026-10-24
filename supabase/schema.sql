-- ============================================================
-- Personal Website schema — run this once in the Supabase SQL Editor
-- (safe to re-run). Files live in Cloudflare R2, not Supabase Storage.
-- ============================================================

-- Who may edit this site. MUST match NEXT_PUBLIC_OWNER_EMAILS.
create or replace function public.is_owner()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'jqianhuii@gmail.com',
    'zhengxianyap@gmail.com'
  )
$$;

-- ---------- tables ----------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content_md text not null default '',
  excerpt text,
  cover_image text,
  published boolean not null default false,
  indexable boolean not null default true, -- false = hidden from search engines
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  published boolean not null default false,
  sort_mode text not null default 'manual'
    check (sort_mode in ('manual', 'newest', 'oldest')),
  created_at timestamptz not null default now()
);

create table if not exists public.album_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  storage_path text,                 -- null for embeds
  caption text,
  sort_order int not null default 0,
  media_type text not null default 'image'
    check (media_type in ('image', 'video', 'embed')),
  embed_url text,                    -- set for YouTube/Vimeo embeds
  taken_at date,                     -- owner-assigned date; date sorting
                                     -- uses this when set, else created_at
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  level int not null default 3 check (level between 1 and 5),
  sort_order int not null default 0
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null
);

-- Connections shown on the homepage (editable from admin)
create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  icon text not null default 'link', -- a known icon key (e.g. 'github') or an emoji
  sort_order int not null default 0
);

-- Badges (Credly / image) shown on the homepage (editable from admin)
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'credly' check (type in ('credly', 'image')),
  badge_id text,   -- credly badge UUID
  image_url text,  -- image badge
  link_url text,   -- image badge target
  title text,
  sort_order int not null default 0
);

-- Projects shown on the homepage (editable from admin)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text,
  sort_order int not null default 0
);

-- Anonymous Q&A
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(trim(question)) between 1 and 500),
  answer text,
  answer_gif text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------

alter table public.posts enable row level security;
alter table public.albums enable row level security;
alter table public.album_images enable row level security;
alter table public.skills enable row level security;
alter table public.site_settings enable row level security;
alter table public.connections enable row level security;
alter table public.badges enable row level security;
alter table public.projects enable row level security;
alter table public.questions enable row level security;

-- posts: public can read published; owner can do anything
drop policy if exists "posts public read" on public.posts;
create policy "posts public read" on public.posts
  for select using (published = true or public.is_owner());

drop policy if exists "posts owner write" on public.posts;
create policy "posts owner write" on public.posts
  for all using (public.is_owner()) with check (public.is_owner());

-- albums: public can read published; owner everything
drop policy if exists "albums public read" on public.albums;
create policy "albums public read" on public.albums
  for select using (published = true or public.is_owner());

drop policy if exists "albums owner write" on public.albums;
create policy "albums owner write" on public.albums
  for all using (public.is_owner()) with check (public.is_owner());

-- album_images: readable when parent album is published (or owner)
drop policy if exists "album_images public read" on public.album_images;
create policy "album_images public read" on public.album_images
  for select using (
    public.is_owner()
    or exists (
      select 1 from public.albums a
      where a.id = album_id and a.published = true
    )
  );

drop policy if exists "album_images owner write" on public.album_images;
create policy "album_images owner write" on public.album_images
  for all using (public.is_owner()) with check (public.is_owner());

-- skills, settings, connections, badges, projects: public read, owner write
drop policy if exists "skills public read" on public.skills;
create policy "skills public read" on public.skills
  for select using (true);

drop policy if exists "skills owner write" on public.skills;
create policy "skills owner write" on public.skills
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings
  for select using (true);

drop policy if exists "settings owner write" on public.site_settings;
create policy "settings owner write" on public.site_settings
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "connections public read" on public.connections;
create policy "connections public read" on public.connections
  for select using (true);

drop policy if exists "connections owner write" on public.connections;
create policy "connections owner write" on public.connections
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "badges public read" on public.badges;
create policy "badges public read" on public.badges
  for select using (true);

drop policy if exists "badges owner write" on public.badges;
create policy "badges owner write" on public.badges
  for all using (public.is_owner()) with check (public.is_owner());

drop policy if exists "projects public read" on public.projects;
create policy "projects public read" on public.projects
  for select using (true);

drop policy if exists "projects owner write" on public.projects;
create policy "projects owner write" on public.projects
  for all using (public.is_owner()) with check (public.is_owner());

-- questions: anyone may ask (the raw question only — never a pre-filled
-- answer or GIF); visitors see answered ones; owner sees and edits everything.
drop policy if exists "questions public ask" on public.questions;
create policy "questions public ask" on public.questions
  for insert with check (
    answer is null and answered_at is null and answer_gif is null
  );

drop policy if exists "questions public read answered" on public.questions;
create policy "questions public read answered" on public.questions
  for select using (
    answer is not null or answer_gif is not null or public.is_owner()
  );

drop policy if exists "questions owner write" on public.questions;
create policy "questions owner write" on public.questions
  for update using (public.is_owner()) with check (public.is_owner());

drop policy if exists "questions owner delete" on public.questions;
create policy "questions owner delete" on public.questions
  for delete using (public.is_owner());
