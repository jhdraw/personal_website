"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resumeUrl } from "@/lib/storage";
import { uploadToR2 } from "@/lib/upload";
import type { Badge, Connection, Profile, Project, Skill } from "@/lib/types";
import ConnectionIcon, { ICON_KEYS } from "@/components/ConnectionIcon";
import { credlyBadgeId } from "@/lib/badge";
import {
  DEFAULT_WATERMARK,
  previewWatermark,
  type WatermarkConfig,
  type WatermarkPosition,
} from "@/lib/watermark";
import {
  parseSpotifyEntry,
  normalizeStored,
  spotifyEntryToLine,
} from "@/lib/spotify";
import {
  DEFAULT_THEME,
  THEME_COLORS,
  normalizeTheme,
  type ThemeConfig,
} from "@/lib/theme";

export default function SettingsPanel() {
  const supabase = supabaseBrowser();
  const resumeInput = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({ name: "", tagline: "", bio: "" });
  const [playlistsText, setPlaylistsText] = useState("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkill, setNewSkill] = useState({ name: "", category: "", level: 3 });

  const [connections, setConnections] = useState<Connection[]>([]);
  const [newConn, setNewConn] = useState({ name: "", url: "", icon: "link", emoji: "" });

  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({ title: "", description: "", url: "" });

  const [watermark, setWatermark] = useState<WatermarkConfig>(DEFAULT_WATERMARK);
  const wmCanvas = useRef<HTMLCanvasElement>(null);

  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  const [badges, setBadges] = useState<Badge[]>([]);
  const [newBadge, setNewBadge] = useState({
    type: "credly" as Badge["type"],
    credly: "",
    image_url: "",
    link_url: "",
    title: "",
  });

  useEffect(() => {
    (async () => {
      const [profileRes, playlistRes, skillsRes, connRes, wmRes, badgesRes, projectsRes, themeRes] =
        await Promise.all([
          supabase.from("site_settings").select("value").eq("key", "profile").maybeSingle(),
          supabase.from("site_settings").select("value").eq("key", "spotify_playlists").maybeSingle(),
          supabase.from("skills").select("*").order("sort_order"),
          supabase.from("connections").select("*").order("sort_order"),
          supabase.from("site_settings").select("value").eq("key", "watermark").maybeSingle(),
          supabase.from("badges").select("*").order("sort_order"),
          supabase.from("projects").select("*").order("sort_order"),
          supabase.from("site_settings").select("value").eq("key", "theme").maybeSingle(),
        ]);
      if (profileRes.data?.value) setProfile(profileRes.data.value as Profile);
      if (playlistRes.data?.value)
        setPlaylistsText(
          normalizeStored(playlistRes.data.value).map(spotifyEntryToLine).join("\n")
        );
      setSkills((skillsRes.data ?? []) as Skill[]);
      setConnections((connRes.data ?? []) as Connection[]);
      if (wmRes.data?.value)
        setWatermark({ ...DEFAULT_WATERMARK, ...(wmRes.data.value as Partial<WatermarkConfig>) });
      setBadges((badgesRes.data ?? []) as Badge[]);
      setProjects((projectsRes.data ?? []) as Project[]);
      setTheme(normalizeTheme(themeRes.data?.value));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw the live preview whenever the watermark settings change.
  useEffect(() => {
    if (wmCanvas.current) previewWatermark(wmCanvas.current, watermark);
  }, [watermark]);

  async function addConnection() {
    if (!newConn.name.trim() || !newConn.url.trim()) {
      setMessage("Connection needs a name and a link.");
      return;
    }
    const icon = newConn.icon === "emoji" ? newConn.emoji.trim() || "🔗" : newConn.icon;
    const { data, error } = await supabase
      .from("connections")
      .insert({
        name: newConn.name.trim(),
        url: newConn.url.trim(),
        icon,
        sort_order: connections.length,
      })
      .select()
      .single();
    if (error) setMessage(`Add connection failed: ${error.message}`);
    else {
      setConnections([...connections, data as Connection]);
      setNewConn({ name: "", url: "", icon: "link", emoji: "" });
    }
  }

  async function removeConnection(connId: string) {
    await supabase.from("connections").delete().eq("id", connId);
    setConnections(connections.filter((c) => c.id !== connId));
  }

  async function addProject() {
    if (!newProject.title.trim()) {
      setMessage("A project needs a name.");
      return;
    }
    const { data, error } = await supabase
      .from("projects")
      .insert({
        title: newProject.title.trim(),
        description: newProject.description.trim() || null,
        url: newProject.url.trim() || null,
        sort_order: projects.length,
      })
      .select()
      .single();
    if (error) setMessage(`Add project failed: ${error.message}`);
    else {
      setProjects([...projects, data as Project]);
      setNewProject({ title: "", description: "", url: "" });
      setMessage("Project added ✔");
    }
  }

  // Saves one edited field on blur, so the owner can rewrite a project's
  // name, description, or link in place.
  async function updateProject(
    projectId: string,
    field: "title" | "description" | "url",
    raw: string
  ) {
    const value = field === "title" ? raw.trim() : raw.trim() || null;
    if (field === "title" && !value) {
      setMessage("A project needs a name.");
      return;
    }
    const current = projects.find((p) => p.id === projectId);
    if (current && (current[field] ?? null) === (value ?? null)) return;
    const { error } = await supabase
      .from("projects")
      .update({ [field]: value })
      .eq("id", projectId);
    if (error) setMessage(`Update failed: ${error.message}`);
    else {
      setProjects((ps) =>
        ps.map((p) => (p.id === projectId ? { ...p, [field]: value } : p))
      );
      setMessage("Project updated ✔");
    }
  }

  async function removeProject(projectId: string) {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) setMessage(`Delete failed: ${error.message}`);
    else setProjects(projects.filter((p) => p.id !== projectId));
  }

  async function addBadge() {
    let row: Partial<Badge>;
    if (newBadge.type === "credly") {
      const id = credlyBadgeId(newBadge.credly);
      if (!id) {
        setMessage("Paste a Credly badge URL or ID.");
        return;
      }
      row = { type: "credly", badge_id: id, title: newBadge.title.trim() || null };
    } else {
      if (!newBadge.image_url.trim()) {
        setMessage("An image badge needs an image URL.");
        return;
      }
      row = {
        type: "image",
        image_url: newBadge.image_url.trim(),
        link_url: newBadge.link_url.trim() || null,
        title: newBadge.title.trim() || null,
      };
    }
    const { data, error } = await supabase
      .from("badges")
      .insert({ ...row, sort_order: badges.length })
      .select()
      .single();
    if (error) setMessage(`Add badge failed: ${error.message}`);
    else {
      setBadges([...badges, data as Badge]);
      setNewBadge({ type: newBadge.type, credly: "", image_url: "", link_url: "", title: "" });
    }
  }

  async function removeBadge(badgeId: string) {
    await supabase.from("badges").delete().eq("id", badgeId);
    setBadges(badges.filter((b) => b.id !== badgeId));
  }

  async function saveSetting(key: string, value: unknown, label: string) {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key, value }, { onConflict: "key" });
    setMessage(error ? `${label} failed: ${error.message}` : `${label} saved ✔`);
  }

  // Preview a palette live by writing the CSS variables onto <html>, the
  // same place the root layout puts the saved theme.
  function previewTheme(next: ThemeConfig) {
    setTheme(next);
    for (const { key } of THEME_COLORS) {
      document.documentElement.style.setProperty(`--color-${key}`, next[key]);
    }
  }

  async function uploadResume(file: File) {
    setMessage("Uploading resume…");
    try {
      // Content-Disposition sets the download filename (R2 is cross-origin, so
      // the HTML download attribute alone is ignored).
      await uploadToR2(file, "resume.pdf", {
        contentType: "application/pdf",
        contentDisposition: 'attachment; filename="Qian Hui_Resume.pdf"',
      });
      setMessage("Resume updated ✔");
    } catch (e) {
      setMessage(`Resume upload failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  async function addSkill() {
    if (!newSkill.name.trim()) return;
    const { data, error } = await supabase
      .from("skills")
      .insert({
        name: newSkill.name.trim(),
        category: newSkill.category.trim() || null,
        level: newSkill.level,
        sort_order: skills.length,
      })
      .select()
      .single();
    if (error) setMessage(`Add skill failed: ${error.message}`);
    else {
      setSkills([...skills, data as Skill]);
      setNewSkill({ name: "", category: newSkill.category, level: 3 });
    }
  }

  async function removeSkill(skillId: string) {
    await supabase.from("skills").delete().eq("id", skillId);
    setSkills(skills.filter((s) => s.id !== skillId));
  }

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-3xl">Settings</h1>

      {message && (
        <p className="brutal-sm -mt-4 inline-block self-start bg-yolk px-3 py-1 font-bold">
          {message}
        </p>
      )}

      {/* profile */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 font-bold">
            Name
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 font-bold">
            Tagline
            <input
              value={profile.tagline}
              onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
            />
          </label>
        </div>
        <label className="mt-4 flex flex-col gap-1 font-bold">
          Bio
          <textarea
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            className="brutal-sm min-h-24 bg-paper px-3 py-2 font-normal"
          />
        </label>
        <button
          onClick={() => saveSetting("profile", profile, "Profile")}
          className="brutal-btn mt-4 bg-lime px-4 py-2"
        >
          SAVE PROFILE
        </button>
      </section>

      {/* resume */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Resume</h2>
        <p className="mb-3">
          Current file:{" "}
          <a href={resumeUrl()} target="_blank" rel="noreferrer" className="font-bold underline">
            resume.pdf
          </a>{" "}
          (404 if none uploaded yet)
        </p>
        <button
          onClick={() => resumeInput.current?.click()}
          className="brutal-btn bg-grape px-4 py-2"
        >
          UPLOAD NEW PDF
        </button>
        <input
          ref={resumeInput}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadResume(f);
            e.target.value = "";
          }}
        />
      </section>

      {/* watermark */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-1 text-2xl">Image watermark</h2>
        <p className="mb-4 text-sm">
          Baked into images when you upload them. Existing images and videos are
          not affected. Save, then re-upload an image to apply changes.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <label className="brutal-btn flex w-fit items-center gap-2 bg-paper px-3 py-2">
              <input
                type="checkbox"
                checked={watermark.enabled}
                onChange={(e) => setWatermark({ ...watermark, enabled: e.target.checked })}
              />
              Watermark enabled
            </label>
            <label className="flex flex-col gap-1 font-bold">
              Text
              <input
                value={watermark.text}
                onChange={(e) => setWatermark({ ...watermark, text: e.target.value })}
                className="brutal-sm bg-paper px-3 py-2 font-normal"
                placeholder="© Your Name"
              />
            </label>
            <label className="flex items-center gap-3 font-bold">
              Text color
              <input
                type="color"
                value={watermark.color}
                onChange={(e) => setWatermark({ ...watermark, color: e.target.value })}
                className="brutal-sm h-10 w-16 bg-paper p-1"
              />
              <span className="font-mono text-sm font-normal">{watermark.color}</span>
            </label>
            <label className="flex flex-col gap-1 font-bold">
              Opacity: {Math.round(watermark.opacity * 100)}%
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(watermark.opacity * 100)}
                onChange={(e) =>
                  setWatermark({ ...watermark, opacity: Number(e.target.value) / 100 })
                }
              />
            </label>
            <label className="flex flex-col gap-1 font-bold">
              Size: {watermark.size}%
              <input
                type="range"
                min={2}
                max={15}
                value={watermark.size}
                onChange={(e) => setWatermark({ ...watermark, size: Number(e.target.value) })}
              />
            </label>
            <label className="flex flex-col gap-1 font-bold">
              Position
              <select
                value={watermark.position}
                onChange={(e) =>
                  setWatermark({
                    ...watermark,
                    position: e.target.value as WatermarkPosition,
                  })
                }
                className="brutal-sm bg-paper px-3 py-2 font-normal"
              >
                <option value="tiled">Tiled (covers whole image)</option>
                <option value="center">Center</option>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="top-right">Top right</option>
                <option value="top-left">Top left</option>
              </select>
            </label>
            {watermark.position !== "tiled" && (
              <label className="flex flex-col gap-1 font-bold">
                Angle: {watermark.angle}°
                <input
                  type="range"
                  min={-90}
                  max={90}
                  value={watermark.angle}
                  onChange={(e) =>
                    setWatermark({ ...watermark, angle: Number(e.target.value) })
                  }
                />
              </label>
            )}
            <button
              onClick={() => saveSetting("watermark", watermark, "Watermark")}
              className="brutal-btn w-fit bg-lime px-4 py-2"
            >
              SAVE WATERMARK
            </button>
          </div>
          <div>
            <p className="mb-2 font-bold">Live preview</p>
            <canvas
              ref={wmCanvas}
              width={320}
              height={200}
              className="brutal h-auto w-full max-w-sm"
            />
          </div>
        </div>
      </section>

      {/* theme */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-1 text-2xl">Theme colors</h2>
        <p className="mb-4 text-sm">
          Pick a color for each part of the site. Changes preview instantly on
          this page; press SAVE THEME to apply them for every visitor.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_COLORS.map((c) => (
            <label
              key={c.key}
              className="flex items-center gap-3 border-3 border-ink bg-paper px-3 py-2 font-bold"
            >
              <input
                type="color"
                value={theme[c.key]}
                onChange={(e) => previewTheme({ ...theme, [c.key]: e.target.value })}
                className="h-9 w-12 cursor-pointer border-3 border-ink bg-paper p-0.5"
              />
              <span className="flex-1">{c.label}</span>
              <span className="font-mono text-lg font-normal">{theme[c.key]}</span>
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => saveSetting("theme", theme, "Theme")}
            className="brutal-btn bg-lime px-4 py-2"
          >
            SAVE THEME
          </button>
          <button
            onClick={() => previewTheme(DEFAULT_THEME)}
            className="brutal-btn bg-paper px-4 py-2"
          >
            RESET TO DEFAULT
          </button>
        </div>
        <p className="mt-2 text-xs">
          Reset only changes the preview — press SAVE THEME afterwards to keep it.
        </p>
      </section>

      {/* skills */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Skills</h2>
        <ul className="mb-4 flex flex-col gap-2">
          {skills.map((s) => (
            <li key={s.id} className="brutal-sm flex items-center gap-3 bg-paper px-3 py-2">
              <span className="font-bold">{s.name}</span>
              {s.category && <span className="sticker bg-sky text-xs">{s.category}</span>}
              <span className="tracking-widest">
                {"■".repeat(s.level)}
                <span className="opacity-25">{"■".repeat(5 - s.level)}</span>
              </span>
              <button
                onClick={() => removeSkill(s.id)}
                className="brutal-btn ml-auto bg-bubble px-2 text-sm"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Skill
            <input
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
              placeholder="TypeScript"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Category
            <input
              value={newSkill.category}
              onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
              placeholder="Languages"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            Level: {newSkill.level}/5
            <input
              type="range"
              min={1}
              max={5}
              value={newSkill.level}
              onChange={(e) => setNewSkill({ ...newSkill, level: Number(e.target.value) })}
            />
          </label>
          <button onClick={addSkill} className="brutal-btn bg-lime px-4 py-2">
            + ADD
          </button>
        </div>
      </section>

      {/* projects */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Projects</h2>
        <p className="mb-4">
          Shown in the &quot;Projects&quot; section on the home page. Edit any
          field below — changes save when you click away.
        </p>
        <ul className="mb-4 flex flex-col gap-3">
          {projects.map((p) => (
            <li key={p.id} className="brutal-sm bg-paper p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  defaultValue={p.title}
                  onBlur={(e) => updateProject(p.id, "title", e.target.value)}
                  className="brutal-sm flex-1 bg-paper px-2 py-1 font-bold"
                  placeholder="Project name"
                />
                <button
                  onClick={() => removeProject(p.id)}
                  className="brutal-btn bg-bubble px-2 text-sm"
                  title="Delete project"
                >
                  ✕
                </button>
              </div>
              <textarea
                defaultValue={p.description ?? ""}
                onBlur={(e) => updateProject(p.id, "description", e.target.value)}
                rows={2}
                className="brutal-sm mt-2 w-full resize-y bg-paper px-2 py-1 text-sm"
                placeholder="What is it? (optional)"
              />
              <input
                defaultValue={p.url ?? ""}
                onBlur={(e) => updateProject(p.id, "url", e.target.value)}
                className="brutal-sm mt-2 w-full bg-paper px-2 py-1 text-sm"
                placeholder="https://github.com/you/project (optional)"
              />
            </li>
          ))}
        </ul>
        <div className="brutal-sm bg-paper p-3">
          <p className="mb-2 font-bold">Add a project</p>
          <div className="flex flex-col gap-2">
            <input
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              className="brutal-sm bg-paper px-2 py-1"
              placeholder="Project name"
            />
            <textarea
              value={newProject.description}
              onChange={(e) =>
                setNewProject({ ...newProject, description: e.target.value })
              }
              rows={2}
              className="brutal-sm w-full resize-y bg-paper px-2 py-1 text-sm"
              placeholder="Short description (optional)"
            />
            <div className="flex flex-wrap gap-2">
              <input
                value={newProject.url}
                onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                className="brutal-sm flex-1 bg-paper px-2 py-1 text-sm"
                placeholder="Link (optional)"
              />
              <button onClick={addProject} className="brutal-btn bg-lime px-4 py-2">
                + ADD
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* connections */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Connections</h2>
        <p className="mb-4">Links shown in the &quot;Connect&quot; section on the home page.</p>
        <ul className="mb-4 flex flex-col gap-2">
          {connections.map((c) => (
            <li key={c.id} className="brutal-sm flex items-center gap-3 bg-paper px-3 py-2">
              <ConnectionIcon icon={c.icon} className="h-5 w-5" />
              <span className="font-bold">{c.name}</span>
              <span className="truncate text-sm opacity-70">{c.url}</span>
              <button
                onClick={() => removeConnection(c.id)}
                className="brutal-btn ml-auto bg-bubble px-2 text-sm"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Icon
            <select
              value={newConn.icon}
              onChange={(e) => setNewConn({ ...newConn, icon: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
            >
              {ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              <option value="emoji">custom emoji…</option>
            </select>
          </label>
          {newConn.icon === "emoji" && (
            <label className="flex flex-col gap-1 text-sm font-bold">
              Emoji
              <input
                value={newConn.emoji}
                onChange={(e) => setNewConn({ ...newConn, emoji: e.target.value })}
                className="brutal-sm w-20 bg-paper px-3 py-2 text-center font-normal"
                placeholder="🔗"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Name
            <input
              value={newConn.name}
              onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
              placeholder="GitHub"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-bold">
            Link
            <input
              value={newConn.url}
              onChange={(e) => setNewConn({ ...newConn, url: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
              placeholder="https://github.com/yourname"
            />
          </label>
          <button onClick={addConnection} className="brutal-btn bg-lime px-4 py-2">
            + ADD
          </button>
        </div>
      </section>

      {/* badges */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Badges</h2>
        <p className="mb-4">
          Credly badges (paste the badge&apos;s share URL or ID) or image badges
          (image URL + optional link), shown in the &quot;Badges&quot; section on
          the home page.
        </p>
        <ul className="mb-4 flex flex-col gap-2">
          {badges.map((b) => (
            <li key={b.id} className="brutal-sm flex items-center gap-3 bg-paper px-3 py-2">
              <span className="sticker bg-tangerine text-xs">{b.type}</span>
              <span className="truncate text-sm">
                {b.title || b.badge_id || b.image_url}
              </span>
              <button
                onClick={() => removeBadge(b.id)}
                className="brutal-btn ml-auto bg-bubble px-2 text-sm"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            Type
            <select
              value={newBadge.type}
              onChange={(e) =>
                setNewBadge({ ...newBadge, type: e.target.value as Badge["type"] })
              }
              className="brutal-sm bg-paper px-3 py-2 font-normal"
            >
              <option value="credly">Credly</option>
              <option value="image">Image + link</option>
            </select>
          </label>
          {newBadge.type === "credly" ? (
            <label className="flex flex-1 flex-col gap-1 text-sm font-bold">
              Credly badge URL or ID
              <input
                value={newBadge.credly}
                onChange={(e) => setNewBadge({ ...newBadge, credly: e.target.value })}
                className="brutal-sm bg-paper px-3 py-2 font-normal"
                placeholder="https://www.credly.com/badges/xxxxxxxx-…"
              />
            </label>
          ) : (
            <>
              <label className="flex flex-1 flex-col gap-1 text-sm font-bold">
                Image URL
                <input
                  value={newBadge.image_url}
                  onChange={(e) => setNewBadge({ ...newBadge, image_url: e.target.value })}
                  className="brutal-sm bg-paper px-3 py-2 font-normal"
                  placeholder="https://…/badge.png"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm font-bold">
                Link (optional)
                <input
                  value={newBadge.link_url}
                  onChange={(e) => setNewBadge({ ...newBadge, link_url: e.target.value })}
                  className="brutal-sm bg-paper px-3 py-2 font-normal"
                  placeholder="https://…"
                />
              </label>
            </>
          )}
          <label className="flex flex-col gap-1 text-sm font-bold">
            Title (optional)
            <input
              value={newBadge.title}
              onChange={(e) => setNewBadge({ ...newBadge, title: e.target.value })}
              className="brutal-sm bg-paper px-3 py-2 font-normal"
              placeholder="AWS Certified…"
            />
          </label>
          <button onClick={addBadge} className="brutal-btn bg-lime px-4 py-2">
            + ADD
          </button>
        </div>
      </section>

      {/* spotify music */}
      <section className="brutal bg-paper p-6">
        <h2 className="mb-4 text-2xl">Spotify music</h2>
        <p className="mb-2 font-bold">
          One Spotify link per line — playlist, album, track, or artist:
        </p>
        <textarea
          value={playlistsText}
          onChange={(e) => setPlaylistsText(e.target.value)}
          className="brutal-sm min-h-28 w-full bg-paper px-3 py-2 font-mono text-sm"
          placeholder={
            "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M\nhttps://open.spotify.com/album/...\nhttps://open.spotify.com/track/..."
          }
        />
        <button
          onClick={() => {
            const lines = playlistsText.split("\n").map((l) => l.trim()).filter(Boolean);
            const entries = lines
              .map(parseSpotifyEntry)
              .filter((e): e is NonNullable<typeof e> => Boolean(e));
            const unrecognized = lines.length - entries.length;
            saveSetting(
              "spotify_playlists",
              entries,
              unrecognized > 0
                ? `Music (${unrecognized} line(s) not recognized as a Spotify link)`
                : "Music"
            );
          }}
          className="brutal-btn mt-3 bg-lime px-4 py-2"
        >
          SAVE MUSIC
        </button>
      </section>
    </div>
  );
}
