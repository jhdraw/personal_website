"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { imageUrl } from "@/lib/storage";
import { uploadToR2 } from "@/lib/upload";
import { watermarkImage } from "@/lib/watermark";
import { useWatermarkConfig } from "@/lib/useWatermarkConfig";
import { slugify } from "@/lib/slugify";
import MarkdownView from "@/components/MarkdownView";

export default function PostEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const supabase = supabaseBrowser();
  const watermark = useWatermarkConfig();
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const contentArea = useRef<HTMLTextAreaElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [indexable, setIndexable] = useState(true);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setMessage(`Could not load post: ${error?.message ?? "not found"}`);
        } else {
          setTitle(data.title);
          setSlug(data.slug);
          setSlugTouched(true);
          setExcerpt(data.excerpt ?? "");
          setContent(data.content_md);
          setPublished(data.published);
          setIndexable(data.indexable ?? true);
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const row = {
      title: title.trim() || "Untitled",
      slug: slug.trim() || slugify(title) || `post-${Date.now()}`,
      excerpt: excerpt.trim() || null,
      content_md: content,
      published,
      indexable,
      updated_at: new Date().toISOString(),
    };

    if (isNew) {
      const { data, error } = await supabase
        .from("posts")
        .insert(row)
        .select("id")
        .single();
      if (error) setMessage(`Save failed: ${error.message}`);
      else {
        setMessage("Created ✔");
        router.replace(`/admin/posts/${data.id}`);
      }
    } else {
      const { error } = await supabase.from("posts").update(row).eq("id", id);
      setMessage(error ? `Save failed: ${error.message}` : "Saved ✔");
    }
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Delete this post permanently?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) setMessage(`Delete failed: ${error.message}`);
    else router.push("/admin/posts");
  }

  // Insert a snippet at the cursor. If text is selected, `wrap` puts it
  // inside the snippet in place of the placeholder.
  function insertSnippet(snippet: string, placeholder = "") {
    const ta = contentArea.current;
    if (!ta) {
      setContent((c) => c + snippet);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const inserted =
      placeholder && selected ? snippet.replace(placeholder, selected) : snippet;
    const next = content.slice(0, start) + inserted + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos =
        placeholder && !selected && inserted.includes(placeholder)
          ? start + inserted.indexOf(placeholder)
          : start + inserted.length;
      ta.setSelectionRange(
        pos,
        placeholder && !selected && inserted.includes(placeholder)
          ? pos + placeholder.length
          : pos
      );
    });
  }

  async function uploadVideo(file: File) {
    setMessage("Uploading video… (this can take a while)");
    const path = `posts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    try {
      await uploadToR2(file, path, { contentType: file.type || "video/mp4" });
    } catch (e) {
      setMessage(`Upload failed: ${e instanceof Error ? e.message : e}`);
      return;
    }
    setContent((c) => `${c}\n\n![${file.name}](${imageUrl(path)})\n`);
    setMessage("Video inserted ✔");
  }

  async function uploadImage(file: File) {
    setMessage("Uploading image…");
    const path = `posts/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    try {
      const blob = await watermarkImage(file, watermark);
      await uploadToR2(blob, path, { contentType: blob.type || file.type });
    } catch (e) {
      setMessage(`Upload failed: ${e instanceof Error ? e.message : e}`);
      return;
    }
    setContent((c) => `${c}\n\n![${file.name}](${imageUrl(path)})\n`);
    setMessage("Image inserted ✔");
  }

  if (loading) return <p className="font-bold">Loading…</p>;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{isNew ? "New post" : "Edit post"}</h1>
        <div className="ml-auto flex flex-wrap gap-2">
          <label className="brutal-btn flex items-center gap-2 bg-paper px-3 py-2">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published
          </label>
          <label
            className={`brutal-btn flex items-center gap-2 px-3 py-2 ${
              indexable ? "bg-paper" : "bg-tangerine"
            }`}
            title="Off = the post stays readable to anyone with the link, but asks search engines not to list it"
          >
            <input
              type="checkbox"
              checked={indexable}
              onChange={(e) => setIndexable(e.target.checked)}
            />
            Searchable
          </label>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="brutal-btn bg-sky px-3 py-2"
          >
            {showPreview ? "HIDE" : "SHOW"} PREVIEW
          </button>
          <button onClick={save} disabled={saving} className="brutal-btn bg-lime px-4 py-2">
            {saving ? "SAVING…" : "SAVE"}
          </button>
          {!isNew && (
            <button onClick={remove} className="brutal-btn bg-bubble px-3 py-2">
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
            placeholder="My great post"
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
            placeholder="my-great-post"
          />
        </label>
      </div>

      <label className="mb-4 flex flex-col gap-1 font-bold">
        Excerpt (shown in the blog list)
        <input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          className="brutal-sm bg-paper px-3 py-2 font-normal"
          placeholder="One or two sentences…"
        />
      </label>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-bold">Content (Markdown)</span>
        <button
          onClick={() => fileInput.current?.click()}
          className="brutal-btn bg-grape px-2 py-1 text-sm"
        >
          + IMAGE
        </button>
        <button
          onClick={() => videoInput.current?.click()}
          className="brutal-btn bg-grape px-2 py-1 text-sm"
        >
          + VIDEO
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadImage(f);
            e.target.value = "";
          }}
        />
        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadVideo(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {(
          [
            ["• List", "\n- item\n- item\n", "item"],
            ["☑ Tickbox", "\n- [ ] todo\n- [x] done\n", "todo"],
            ["1. List", "\n1. first\n2. second\n", "first"],
            [
              "Table",
              "\n| Col 1 | Col 2 |\n| --- | --- |\n| cell | cell |\n",
              "",
            ],
            ["Code", "\n```js\ncode here\n```\n", "code here"],
            ["∑ Inline math", "$x^2$", "x^2"],
            ["∫ Math block", "\n$$\nE = mc^2\n$$\n", "E = mc^2"],
          ] as [string, string, string][]
        ).map(([label, snippet, ph]) => (
          <button
            key={label}
            type="button"
            onClick={() => insertSnippet(snippet, ph)}
            className="brutal-btn bg-paper px-2 py-1 text-xs"
            title={`Insert ${label}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 ${showPreview ? "lg:grid-cols-2" : ""}`}>
        <textarea
          ref={contentArea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="brutal min-h-[28rem] w-full resize-y bg-paper p-4 font-mono text-sm"
          placeholder={"# Heading\n\nWrite your post in **Markdown**…"}
        />
        {showPreview && (
          <div className="brutal min-h-[28rem] overflow-auto bg-paper p-4">
            <MarkdownView content={content || "*Nothing to preview yet…*"} />
          </div>
        )}
      </div>
    </div>
  );
}
