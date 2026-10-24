// Extracts a Credly badge UUID from a raw ID or any Credly badge URL, and
// builds the official embed iframe src. Acts as an allow-list: only Credly's
// own host is ever put in an <iframe src>.
export function credlyBadgeId(input: string): string | null {
  const m = input
    .trim()
    .match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

export function credlyEmbedSrc(badgeId: string): string {
  return `https://www.credly.com/embedded_badge/${badgeId}`;
}
