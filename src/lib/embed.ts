// Parses a YouTube/Vimeo URL into a safe embed. Acts as an allow-list:
// unknown providers return null, so we never drop an arbitrary URL into an
// <iframe src> (which would be an injection risk).

export type ParsedEmbed = {
  provider: "youtube" | "vimeo";
  id: string;
  embedSrc: string;
  thumbnail: string | null;
};

export function parseEmbed(input: string): ParsedEmbed | null {
  const url = input.trim();
  if (!url) return null;

  // YouTube: watch?v=, youtu.be/, /embed/, /shorts/
  const yt =
    url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) {
    const id = yt[1];
    return {
      provider: "youtube",
      id,
      embedSrc: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Vimeo: vimeo.com/<id> or player.vimeo.com/video/<id>
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) {
    const id = vimeo[1];
    return {
      provider: "vimeo",
      id,
      embedSrc: `https://player.vimeo.com/video/${id}`,
      thumbnail: null, // Vimeo needs an API call for thumbnails; skip it
    };
  }

  return null;
}
