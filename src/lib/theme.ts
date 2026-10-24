// Admin-editable theme colors. Each key maps to a CSS custom property
// (`--color-<key>`) that globals.css defines as the default and every
// Tailwind color utility (bg-paper, text-ink, …) reads. The saved config lives
// in site_settings.theme and is applied as inline CSS variables on <html>.

export const THEME_COLORS = [
  { key: "desk", label: "Page background", default: "#c9d6fb" },
  { key: "grid", label: "Background grid lines", default: "#e6ecff" },
  { key: "paper", label: "Window / card", default: "#fde9d3" },
  { key: "ink", label: "Outlines & text", default: "#3d2b2b" },
  { key: "sky", label: "Accent: teal", default: "#62b8ad" },
  { key: "tangerine", label: "Accent: orange", default: "#f08a3c" },
  { key: "yolk", label: "Accent: yellow", default: "#f5c94e" },
  { key: "bubble", label: "Accent: pink", default: "#f48fb4" },
  { key: "grape", label: "Accent: blue", default: "#8ea4f0" },
  { key: "lime", label: "Accent: green", default: "#7fcf70" },
] as const;

export type ThemeKey = (typeof THEME_COLORS)[number]["key"];
export type ThemeConfig = Record<ThemeKey, string>;

export const DEFAULT_THEME = Object.fromEntries(
  THEME_COLORS.map((c) => [c.key, c.default])
) as ThemeConfig;

const HEX = /^#[0-9a-f]{6}$/i;

// Merge a stored (possibly partial or malformed) value over the defaults,
// keeping only well-formed hex colors.
export function normalizeTheme(value: unknown): ThemeConfig {
  const theme = { ...DEFAULT_THEME };
  if (value && typeof value === "object") {
    for (const { key } of THEME_COLORS) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === "string" && HEX.test(v)) theme[key] = v.toLowerCase();
    }
  }
  return theme;
}

// CSS variables for the colors that differ from the defaults.
export function themeVars(theme: ThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const { key } of THEME_COLORS) {
    if (theme[key] !== DEFAULT_THEME[key]) vars[`--color-${key}`] = theme[key];
  }
  return vars;
}
