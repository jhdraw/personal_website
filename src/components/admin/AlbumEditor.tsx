"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { imageUrl } from "@/lib/storage";
import { uploadToR2, deleteFromR2, presignDownloadUrl } from "@/lib/upload";
import { watermarkImage } from "@/lib/watermark";
import { useWatermarkConfig } from "@/lib/useWatermarkConfig";
import { slugify } from "@/lib/slugify";
import { parseEmbed } from "@/lib/embed";
import {
  sortAlbumImages,
  type AlbumImage,
  type AlbumSortMode,
} from "@/lib/types";

export default function AlbumEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const supabase = supabaseBrowser();
  const watermark = useWatermarkConfig();
  const fileInput = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);
  const [sortMode, setSortMode] = useState<AlbumSortMode>("manual");
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [embedInput, setEmbedInput] = useState("");
  // cache-busting tokens so a rotated image reloads despite the URL staying the same
  const [bust, setBust] = useState<Record<string, number>>({});

  const loadImages = useCallback(async () => {
    const { data } = await supabase
      .from("album_images")
      .select("*")
      .eq("album_id", id)
      .order("sort_order");
    setImages((data ?? []) as AlbumImage[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("albums")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setMessage(`Could not load album: ${error?.message ?? "not found"}`);
        } else {
          setTitle(data.title);
          setSlug(data.slug);
          setSlugTouched(true);
          setDescription(data.description ?? "");
          setPublished(data.published);
          setSortMode((data.sort_mode as AlbumSortMode) ?? "manual");
        }
        setLoading(false);
      });
    // async: state updates happen after the fetch resolves, not synchronously
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const row = {
      title: title.trim() || "Untitled album",
      slug: slug.trim() || slugify(title) || `album-${Date.now()}`,
      description: description.trim() || null,
      published,
      sort_mode: sortMode,
    };

    if (isNew) {
      const { data, error } = await supabase
        .from("albums")
        .insert(row)
        .select("id")
        .single();
      if (error) setMessage(`Save failed: ${error.message}`);
      else router.replace(`/admin/albums/${data.id}`);
    } else {
      const { error } = await supabase.from("albums").update(row).eq("id", id);
      setMessage(error ? `Save failed: ${error.message}` : "Saved ✔");
    }
    setSaving(false);
  }

  async function removeAlbum() {
    if (!confirm("Delete this album and all its contents permanently?")) return;
    const paths = images
      .map((i) => i.storage_path)
      .filter((p): p is string => Boolean(p));
    if (paths.length) await deleteFromR2(paths).catch(() => {});
    const { error } = await supabase.from("albums").delete().eq("id", id);
    if (error) setMessage(`Delete failed: ${error.message}`);
    else router.push("/admin/albums");
  }

  async function uploadFiles(files: FileList) {
    setUploading(true);
    setMessage(null);
    let order = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
    for (const file of Array.from(files)) {
      const path = `albums/${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const isVideo = file.type.startsWith("video/");
      try {
        // Images are watermarked before upload; videos can't be (browser).
        const blob = isVideo ? file : await watermarkImage(file, watermark);
        await uploadToR2(blob, path, { contentType: blob.type || file.type });
      } catch (e) {
        setMessage(`Upload failed (${file.name}): ${e instanceof Error ? e.message : e}`);
        continue;
      }
      const media_type = isVideo ? "video" : "image";
      const { error: insErr } = await supabase
        .from("album_images")
        .insert({ album_id: id, storage_path: path, sort_order: order++, media_type });
      if (insErr) setMessage(`DB insert failed: ${insErr.message}`);
    }
    await loadImages();
    setUploading(false);
  }

  async function addEmbed() {
    const parsed = parseEmbed(embedInput);
    if (!parsed) {
      setMessage("Paste a valid YouTube or Vimeo link.");
      return;
    }
    const order = images.length ? Math.max(...images.map((i) => i.sort_order)) + 1 : 0;
    const { error } = await supabase.from("album_images").insert({
      album_id: id,
      media_type: "embed",
      embed_url: embedInput.trim(),
      sort_order: order,
    });
    if (error) setMessage(`Add video failed: ${error.message}`);
    else {
      setEmbedInput("");
      setMessage("Video link added ✔");
      await loadImages();
    }
  }

  async function updateCaption(imageId: string, caption: string) {
    await supabase
      .from("album_images")
      .update({ caption: caption.trim() || null })
      .eq("id", imageId);
  }

  async function updateTakenAt(imageId: string, date: string) {
    const { error } = await supabase
      .from("album_images")
      .update({ taken_at: date || null })
      .eq("id", imageId);
    if (error) setMessage(`Date update failed: ${error.message}`);
    else await loadImages();
  }

  async function removeImage(img: AlbumImage) {
    if (!confirm("Remove this item?")) return;
    if (img.storage_path) {
      await deleteFromR2([img.storage_path]).catch(() => {});
    }
    await supabase.from("album_images").delete().eq("id", img.id);
    await loadImages();
  }

  async function rotateImage(img: AlbumImage) {
    if (img.media_type !== "image" || !img.storage_path) return;
    const storagePath = img.storage_path;
    setRotatingId(img.id);
    setMessage(null);
    try {
      // Fetch the bytes via a presigned GET (bucket CORS allows it) and read
      // them as a blob — fetching the body directly never taints a canvas, so
      // we can re-encode the rotated image and upload it back.
      const getUrl = await presignDownloadUrl(storagePath);
      const blob = await (await fetch(getUrl)).blob();

      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.height;
      canvas.height = bitmap.width;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unsupported");
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const type = blob.type || "image/jpeg";
      const rotated: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("encode failed"))),
          type,
          0.92
        )
      );

      await uploadToR2(rotated, storagePath, { contentType: type });

      setBust((b) => ({ ...b, [img.id]: Date.now() }));
      setMessage("Rotated ✔");
    } catch (e) {
      setMessage(`Rotate failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRotatingId(null);
    }
  }

  async function swapOrder(a: AlbumImage, b: AlbumImage | undefined) {
    if (!b) return;
    await Promise.all([
      supabase.from("album_images").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("album_images").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await loadImages();
  }

  if (loading) return <p className="font-bold">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{isNew ? "New album" : "Edit album"}</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <label className="brutal-btn flex items-center gap-2 bg-paper px-3 py-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
          <button onClick={save} disabled={saving} className="brutal-btn bg-lime px-4 py-2">
            {saving ? "SAVING…" : "SAVE"}
          </button>
          {!isNew && (
            <button onClick={removeAlbum} className="brutal-btn bg-bubble px-3 py-2">
              DELETE
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="brutal-sm mb-4 inline-block bg-yolk px-3 py-1 font-bold">{message}</p>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 font-bold">
          Title
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="brutal-sm bg-paper px-3 py-2 font-normal"
          />
        </label>
        <label className="flex flex-col gap-1 font-bold">
          Slug (URL)
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            className="brutal-sm bg-paper px-3 py-2 font-mono font-normal"
          />
        </label>
      </div>

      <label className="mb-6 flex flex-col gap-1 font-bold">
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="brutal-sm min-h-24 bg-paper px-3 py-2 font-normal"
          placeholder="What's this album about?"
        />
      </label>

      {isNew ? (
        <div className="brutal bg-paper p-6 font-bold">
          Save the album first, then you can add photos and videos.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl">Media</h2>
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="brutal-btn bg-grape px-3 py-1"
            >
              {uploading ? "UPLOADING…" : "+ ADD PHOTOS / VIDEOS"}
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm font-bold">
              Sort
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as AlbumSortMode)}
                className="brutal-sm bg-paper px-2 py-1 font-normal"
                title="Remember to hit SAVE — the public page uses this order too"
              >
                <option value="manual">Manual (arrows)</option>
                <option value="newest">Newest upload first</option>
                <option value="oldest">Oldest upload first</option>
              </select>
            </label>
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files?.length) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Embed a YouTube / Vimeo video (no storage cost) */}
          <div className="brutal-sm mb-6 flex flex-wrap items-end gap-2 bg-paper p-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-bold">
              Or paste a YouTube / Vimeo link
              <input
                value={embedInput}
                onChange={(e) => setEmbedInput(e.target.value)}
                placeholder="https://youtu.be/…  or  https://vimeo.com/…"
                className="brutal-sm bg-paper px-3 py-2 font-normal"
              />
            </label>
            <button onClick={addEmbed} className="brutal-btn bg-lime px-4 py-2">
              + ADD VIDEO LINK
            </button>
          </div>

          <p className="mb-4 text-sm">
            Tip: uploaded videos use your storage quota — keep them short.
            YouTube/Vimeo links cost no storage.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortAlbumImages(images, sortMode).map((img, i, displayed) => {
              const embed =
                img.media_type === "embed" && img.embed_url
                  ? parseEmbed(img.embed_url)
                  : null;
              return (
                <div key={img.id} className="brutal bg-paper p-3">
                  <span className="sticker mb-2 bg-sky text-xs">
                    {img.media_type === "embed"
                      ? embed?.provider?.toUpperCase() ?? "LINK"
                      : img.media_type.toUpperCase()}
                  </span>
                  {embed ? (
                    embed.thumbnail ? (
                      <div className="relative h-44 w-full border-3 border-ink">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={embed.thumbnail} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-3xl text-paper">
                          ▶
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-44 w-full items-center justify-center border-3 border-ink bg-grape text-3xl">
                        ▶
                      </div>
                    )
                  ) : img.media_type === "video" && img.storage_path ? (
                    <video
                      src={imageUrl(img.storage_path) + (bust[img.id] ? `?v=${bust[img.id]}` : "")}
                      muted
                      playsInline
                      preload="metadata"
                      controls
                      className="h-44 w-full border-3 border-ink bg-ink object-contain"
                    />
                  ) : img.storage_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl(img.storage_path) + (bust[img.id] ? `?v=${bust[img.id]}` : "")}
                      alt=""
                      className="h-44 w-full border-3 border-ink object-cover"
                    />
                  ) : null}
                  <textarea
                    defaultValue={img.caption ?? ""}
                    placeholder="Caption…"
                    onBlur={(e) => updateCaption(img.id, e.target.value)}
                    className="brutal-sm mt-3 w-full bg-paper px-2 py-1 text-sm"
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs font-bold">
                    Date
                    <input
                      type="date"
                      defaultValue={img.taken_at ?? ""}
                      onBlur={(e) => {
                        if ((img.taken_at ?? "") !== e.target.value)
                          updateTakenAt(img.id, e.target.value);
                      }}
                      className="brutal-sm flex-1 bg-paper px-2 py-1 font-normal"
                      title="Used by date sorting; falls back to upload time when empty"
                    />
                  </label>
                  <div className="mt-2 flex gap-2">
                    {sortMode === "manual" && (
                      <>
                        <button
                          onClick={() => swapOrder(img, displayed[i - 1])}
                          className="brutal-btn bg-sky px-2 text-sm"
                        >
                          ←
                        </button>
                        <button
                          onClick={() => swapOrder(img, displayed[i + 1])}
                          className="brutal-btn bg-sky px-2 text-sm"
                        >
                          →
                        </button>
                      </>
                    )}
                    {img.media_type === "image" && (
                      <button
                        onClick={() => rotateImage(img)}
                        disabled={rotatingId === img.id}
                        title="Rotate 90° clockwise"
                        className="brutal-btn bg-yolk px-2 text-sm disabled:opacity-60"
                      >
                        {rotatingId === img.id ? "…" : "⟳"}
                      </button>
                    )}
                    <button
                      onClick={() => removeImage(img)}
                      className="brutal-btn ml-auto bg-bubble px-2 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
