export type Post = {
  id: string;
  slug: string;
  title: string;
  content_md: string;
  excerpt: string | null;
  cover_image: string | null;
  published: boolean;
  indexable: boolean; // false = published but hidden from search engines
  created_at: string;
  updated_at: string;
};

export type AlbumSortMode = "manual" | "newest" | "oldest";

export type Album = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  published: boolean;
  sort_mode: AlbumSortMode;
  created_at: string;
  album_images?: AlbumImage[];
};

export type Question = {
  id: string;
  question: string;
  answer: string | null;
  answer_gif: string | null; // GIPHY gif URL attached to the answer
  answered_at: string | null;
  created_at: string;
};

export type MediaType = "image" | "video" | "embed";

export type AlbumImage = {
  id: string;
  album_id: string;
  storage_path: string | null; // null for embeds
  caption: string | null;
  sort_order: number;
  media_type: MediaType;
  embed_url: string | null; // set for embeds (YouTube/Vimeo)
  taken_at: string | null; // owner-assigned date; overrides created_at for sorting
  created_at: string;
};

// Date used for "newest"/"oldest" sorting: the assigned date if set, else the
// upload timestamp. Both are ISO strings, so string comparison sorts correctly.
export function imageSortDate(img: AlbumImage): string {
  return img.taken_at ?? img.created_at;
}

export function sortAlbumImages(
  images: AlbumImage[],
  mode: AlbumSortMode = "manual"
): AlbumImage[] {
  const arr = [...images];
  if (mode === "newest")
    return arr.sort((a, b) => imageSortDate(b).localeCompare(imageSortDate(a)));
  if (mode === "oldest")
    return arr.sort((a, b) => imageSortDate(a).localeCompare(imageSortDate(b)));
  return arr.sort((a, b) => a.sort_order - b.sort_order);
}

export type Skill = {
  id: string;
  name: string;
  category: string | null;
  level: number;
  sort_order: number;
};

export type Profile = {
  name: string;
  tagline: string;
  bio: string;
};

export type Connection = {
  id: string;
  name: string;
  url: string;
  icon: string; // known icon key (see ConnectionIcon) or an emoji
  sort_order: number;
};

export type Project = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  sort_order: number;
};

export type Badge = {
  id: string;
  type: "credly" | "image";
  badge_id: string | null; // credly badge UUID
  image_url: string | null;
  link_url: string | null;
  title: string | null;
  sort_order: number;
};
