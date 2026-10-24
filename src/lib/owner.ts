// Single source of truth for who may edit the site.
// Must match the emails in supabase/schema.sql -> is_owner().
export const OWNER_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_OWNER_EMAILS ??
  "jqianhuii@gmail.com,zhengxianyap@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isOwnerEmail(email: string | null | undefined): boolean {
  return Boolean(email && OWNER_EMAILS.includes(email.toLowerCase()));
}
