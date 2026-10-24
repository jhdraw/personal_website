// Public file URLs now come from Cloudflare R2 (served via the r2.dev domain).
// Object keys are unchanged from the old Supabase paths, so existing rows keep
// working once their files are migrated.
const R2_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

export function imageUrl(storagePath: string) {
  if (!R2_BASE || !storagePath) return "";
  return `${R2_BASE}/${storagePath}`;
}

export function resumeUrl() {
  if (!R2_BASE) return "#";
  // The download filename is set via the object's Content-Disposition at upload
  // time (see SettingsPanel), so no query param is needed here.
  return `${R2_BASE}/resume.pdf`;
}
