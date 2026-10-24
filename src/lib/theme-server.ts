import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_THEME, normalizeTheme, type ThemeConfig } from "@/lib/theme";

// Reads the saved theme for the root layout. site_settings is publicly
// readable, so a cookie-less anon client is enough and keeps this off the
// auth path. Any failure falls back to the default palette.
export async function getTheme(): Promise<ThemeConfig> {
  // Read per request so a saved theme shows up without a redeploy.
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_THEME;
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "theme")
      .maybeSingle();
    return normalizeTheme(data?.value);
  } catch {
    return DEFAULT_THEME;
  }
}
