import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await supabaseServer();

  const [posts, albums, skills, questions] = await Promise.all([
    supabase.from("posts").select("id, published"),
    supabase.from("albums").select("id, published"),
    supabase.from("skills").select("id"),
    supabase.from("questions").select("id, answer"),
  ]);

  const cards = [
    {
      href: "/admin/posts",
      label: "POSTS",
      color: "bg-bubble",
      stat: `${posts.data?.filter((p) => p.published).length ?? 0} published / ${posts.data?.length ?? 0} total`,
    },
    {
      href: "/admin/albums",
      label: "ALBUMS",
      color: "bg-sky",
      stat: `${albums.data?.filter((a) => a.published).length ?? 0} published / ${albums.data?.length ?? 0} total`,
    },
    {
      href: "/admin/qna",
      label: "Q&A",
      color: "bg-grape",
      stat: `${questions.data?.filter((q) => !q.answer).length ?? 0} waiting / ${questions.data?.length ?? 0} total`,
    },
    {
      href: "/admin/settings",
      label: "SETTINGS",
      color: "bg-lime",
      stat: `${skills.data?.length ?? 0} skills · resume · playlists`,
    },
  ];

  return (
    <div>
      <h1 className="mb-8 text-3xl">Welcome back 👋</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`brutal block p-6 transition-transform hover:-translate-y-1 ${c.color}`}
          >
            <h2 className="text-2xl">{c.label}</h2>
            <p className="mt-2 font-bold">{c.stat}</p>
          </Link>
        ))}
      </div>
      <Link href="/" className="brutal-btn mt-8 inline-block bg-paper px-4 py-2">
        VIEW SITE →
      </Link>
    </div>
  );
}
