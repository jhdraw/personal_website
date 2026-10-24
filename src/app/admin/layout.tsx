import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import SignOutButton from "@/components/admin/SignOutButton";

// Second line of defense after middleware; RLS is the final one.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isOwnerEmail(user.email)) {
    redirect("/login");
  }

  return (
    <div>
      <div className="brutal mb-8 flex flex-wrap items-center gap-2 bg-ink p-3 text-paper">
        <span className="sticker bg-tangerine text-ink">ADMIN</span>
        <nav className="flex flex-wrap gap-2">
          <Link href="/admin" className="brutal-btn bg-paper px-3 py-1 text-sm text-ink">
            DASHBOARD
          </Link>
          <Link href="/admin/posts" className="brutal-btn bg-bubble px-3 py-1 text-sm text-ink">
            POSTS
          </Link>
          <Link href="/admin/albums" className="brutal-btn bg-sky px-3 py-1 text-sm text-ink">
            ALBUMS
          </Link>
          <Link href="/admin/qna" className="brutal-btn bg-grape px-3 py-1 text-sm text-ink">
            Q&amp;A
          </Link>
          <Link href="/admin/settings" className="brutal-btn bg-lime px-3 py-1 text-sm text-ink">
            SETTINGS
          </Link>
        </nav>
        <div className="ml-auto">
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
