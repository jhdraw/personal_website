import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resumeUrl } from "@/lib/storage";
import type { Badge, Connection, Profile, Project, Skill } from "@/lib/types";
import NowPlaying from "@/components/NowPlaying";
import PixelIcon from "@/components/PixelIcon";
import WindowBar from "@/components/WindowBar";
import ConnectionIcon from "@/components/ConnectionIcon";
import { credlyEmbedSrc } from "@/lib/badge";

export const dynamic = "force-dynamic";

const FALLBACK_PROFILE: Profile = {
  name: "Qian Hui",
  tagline: "Developer · Builder · Music addict",
  bio: "Welcome to my corner of the internet. I build things, write about what I learn, and keep my camera roll busy.",
};

async function getData() {
  try {
    const supabase = await supabaseServer();
    const [skillsRes, profileRes, connectionsRes, badgesRes, projectsRes] =
      await Promise.all([
        supabase.from("skills").select("*").order("sort_order"),
        supabase.from("site_settings").select("value").eq("key", "profile").maybeSingle(),
        supabase.from("connections").select("*").order("sort_order"),
        supabase.from("badges").select("*").order("sort_order"),
        supabase.from("projects").select("*").order("sort_order"),
      ]);
    return {
      skills: (skillsRes.data ?? []) as Skill[],
      profile: { ...FALLBACK_PROFILE, ...((profileRes.data?.value as Partial<Profile>) ?? {}) },
      connections: (connectionsRes.data ?? []) as Connection[],
      badges: (badgesRes.data ?? []) as Badge[],
      projects: (projectsRes.data ?? []) as Project[],
    };
  } catch {
    return {
      skills: [] as Skill[],
      profile: FALLBACK_PROFILE,
      connections: [] as Connection[],
      badges: [] as Badge[],
      projects: [] as Project[],
    };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Safety net: if Supabase falls back to the Site URL (home) after OAuth
  // instead of /auth/callback, forward the code so the session still gets
  // established rather than silently dropped on the home page.
  const { code } = await searchParams;
  if (code) redirect(`/auth/callback?code=${encodeURIComponent(code)}`);

  const { skills, profile, connections, badges, projects } = await getData();

  const categories = [...new Set(skills.map((s) => s.category ?? "Skills"))];

  return (
    <div className="flex flex-col gap-14">
      {/* hero */}
      <section className="brutal-lg relative bg-paper">
        <WindowBar title="hello_world.exe" color="bg-sky" />
        <div className="relative p-8 sm:p-12">
          <div className="pointer-events-none absolute right-6 top-6 hidden gap-3 sm:flex" aria-hidden>
            <PixelIcon name="star" fill="var(--color-yolk)" className="h-8 w-8" />
            <PixelIcon name="heart" fill="var(--color-bubble)" className="h-8 w-8" />
            <PixelIcon name="note" fill="var(--color-ink)" className="h-8 w-8" />
          </div>
          <span className="sticker mb-4 bg-ink text-paper">HELLO!</span>
          <h1 className="text-4xl leading-tight sm:text-6xl">
            {profile.name}
            <span className="blink" aria-hidden>_</span>
          </h1>
          <p className="mt-3 inline-block border-3 border-ink bg-yolk px-3 py-1 text-lg font-bold sm:text-xl">
            {profile.tagline}
          </p>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-lg">{profile.bio}</p>
          <div className="mt-7 flex flex-wrap gap-4">
            <a
              href={resumeUrl()}
              download="Qian Hui_Resume.pdf"
              className="brutal-btn bg-ink px-5 py-2 text-lg text-paper"
            >
              ⬇ DOWNLOAD RESUME
            </a>
            <Link href="/blog" className="brutal-btn bg-yolk px-5 py-2 text-lg">
              READ THE BLOG →
            </Link>
          </div>
        </div>
      </section>

      {/* skills */}
      <section>
        <h2 className="sticker mb-6 bg-sky text-2xl sm:text-3xl">
          SKILLS
        </h2>
        {skills.length === 0 ? (
          <div className="brutal bg-paper p-6">
            <p className="font-bold">
              No skills added yet — add them in the admin panel at{" "}
              <code>/admin/settings</code>.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {categories.map((cat, i) => (
              <div key={cat} className="brutal bg-paper">
                <WindowBar
                  title={cat}
                  color={["bg-sky", "bg-tangerine", "bg-grape", "bg-lime"][i % 4]}
                />
                <ul className="flex flex-col gap-2 p-5">
                  {skills
                    .filter((s) => (s.category ?? "Skills") === cat)
                    .map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2">
                        <span className="font-bold">{s.name}</span>
                        <span
                          aria-label={`level ${s.level} of 5`}
                          className="pixel-progress w-28 shrink-0"
                          style={{ "--progress": `${s.level * 20}%` } as React.CSSProperties}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* projects */}
      {projects.length > 0 && (
        <section>
          <h2 className="sticker mb-6 bg-bubble text-2xl sm:text-3xl">
            PROJECTS
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {projects.map((p, i) => {
              const color = ["bg-tangerine", "bg-sky", "bg-grape", "bg-bubble"][i % 4];
              const card = (
                <>
                  <WindowBar title={`project_${i + 1}.exe`} color={color} />
                  <div className="p-5">
                    <h3 className="text-xl">{p.title}</h3>
                    {p.description && (
                      <p className="mt-2 whitespace-pre-line">{p.description}</p>
                    )}
                    {p.url && (
                      <p className="mt-3 font-bold">VIEW PROJECT →</p>
                    )}
                  </div>
                </>
              );
              return p.url ? (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="brutal block bg-paper transition-transform hover:-translate-y-1"
                >
                  {card}
                </a>
              ) : (
                <div key={p.id} className="brutal bg-paper">
                  {card}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* connections */}
      {connections.length > 0 && (
        <section>
          <h2 className="sticker mb-6 bg-grape text-2xl sm:text-3xl">
            CONNECT
          </h2>
          <div className="flex flex-wrap gap-4">
            {connections.map((c) => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noreferrer noopener"
                className="brutal-btn flex items-center gap-3 bg-paper px-4 py-3"
              >
                <ConnectionIcon icon={c.icon} />
                <span className="font-bold">{c.name}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* badges */}
      {badges.length > 0 && (
        <section>
          <h2 className="sticker mb-6 bg-tangerine text-2xl sm:text-3xl">
            BADGES
          </h2>
          <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((b) =>
              b.type === "credly" && b.badge_id ? (
                <div key={b.id} className="brutal bg-paper p-2">
                  <iframe
                    src={credlyEmbedSrc(b.badge_id)}
                    title={b.title ?? "Credly badge"}
                    width={150}
                    height={270}
                    style={{ border: 0 }}
                  />
                </div>
              ) : b.image_url ? (
                <a
                  key={b.id}
                  href={b.link_url ?? "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="brutal block bg-paper p-3 transition-transform hover:-translate-y-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.image_url}
                    alt={b.title ?? "badge"}
                    className="h-40 w-auto"
                  />
                </a>
              ) : null
            )}
          </div>
        </section>
      )}

      {/* now playing */}
      <section>
        <h2 className="sticker mb-6 bg-lime text-2xl sm:text-3xl">
          ON REPEAT
        </h2>
        <NowPlaying />
        <Link href="/spotify" className="brutal-btn mt-4 inline-block bg-paper px-4 py-2">
          MORE MUSIC →
        </Link>
      </section>
    </div>
  );
}
