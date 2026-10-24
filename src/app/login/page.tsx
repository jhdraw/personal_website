"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="brutal-lg bg-yolk p-8 text-center">
        <h1 className="text-3xl">OWNER LOGIN</h1>
        <p className="mt-3 font-bold">
          This area is for the site owner only. Visitors don&apos;t need to log in
          for anything.
        </p>
        <button
          onClick={signIn}
          disabled={busy}
          className="brutal-btn mt-6 w-full bg-paper px-5 py-3 text-lg disabled:opacity-60"
        >
          {busy ? "REDIRECTING…" : "SIGN IN WITH GOOGLE"}
        </button>
        {error && (
          <p className="brutal-sm mt-4 bg-bubble px-3 py-2 font-bold">{error}</p>
        )}
      </div>
    </div>
  );
}
