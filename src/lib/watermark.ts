// Bakes a watermark into an image (client-side, on a canvas). Because the mark
// becomes part of the pixels, it survives long-press saves, screenshots, and
// direct downloads. Settings are owner-configurable (Admin → Settings).

export type WatermarkPosition =
  | "tiled"
  | "center"
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export type WatermarkConfig = {
  enabled: boolean;
  text: string;
  color: string; // hex, e.g. "#ffffff"
  opacity: number; // 0..1, fill alpha
  size: number; // font size as a percentage of the image's shorter side
  position: WatermarkPosition;
  angle: number; // degrees, applied for non-tiled positions
};

export const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: true,
  text: "© Qian Hui",
  color: "#ffffff",
  opacity: 0.3,
  size: 5,
  position: "tiled",
  angle: 0,
};

function hexToRgb(hex: string) {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 255, g: 255, b: 255 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cfg: WatermarkConfig
) {
  if (!cfg.enabled || !cfg.text.trim()) return;

  const fontSize = Math.max(10, Math.round((Math.min(w, h) * cfg.size) / 100));
  const { r, g, b } = hexToRgb(cfg.color);
  // Auto-contrasting outline keeps the text legible on any photo.
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const outline = lum > 140 ? "0,0,0" : "255,255,255";
  ctx.save();
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.fillStyle = `rgba(${r},${g},${b},${cfg.opacity})`;
  ctx.strokeStyle = `rgba(${outline},${Math.min(cfg.opacity * 0.5, 1)})`;
  ctx.lineWidth = Math.max(1, fontSize / 14);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (cfg.position === "tiled") {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const stepX = ctx.measureText(cfg.text).width + fontSize * 2.5;
    const stepY = fontSize * 4;
    const diag = Math.sqrt(w * w + h * h);
    for (let y = -diag; y < diag; y += stepY) {
      for (let x = -diag; x < diag; x += stepX) {
        ctx.strokeText(cfg.text, x, y);
        ctx.fillText(cfg.text, x, y);
      }
    }
  } else {
    const pad = fontSize;
    const tw = ctx.measureText(cfg.text).width;
    let x = w / 2;
    let y = h / 2;
    if (cfg.position.includes("right")) x = w - pad - tw / 2;
    if (cfg.position.includes("left")) x = pad + tw / 2;
    if (cfg.position.includes("bottom")) y = h - pad - fontSize / 2;
    if (cfg.position.includes("top")) y = pad + fontSize / 2;
    ctx.translate(x, y);
    ctx.rotate(((cfg.angle ?? 0) * Math.PI) / 180);
    ctx.strokeText(cfg.text, 0, 0);
    ctx.fillText(cfg.text, 0, 0);
  }
  ctx.restore();
}

export async function watermarkImage(
  file: Blob,
  cfg: WatermarkConfig
): Promise<Blob> {
  if (!cfg.enabled) return file;
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  drawWatermark(ctx, canvas.width, canvas.height, cfg);

  const type = (file as File).type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), type, 0.92)
  );
}

// Draws a sample "photo" gradient with the watermark applied, for the live
// preview in the admin settings.
export function previewWatermark(
  canvas: HTMLCanvasElement,
  cfg: WatermarkConfig
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#5b6472");
  grad.addColorStop(0.5, "#8a93a3");
  grad.addColorStop(1, "#3f4654");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  drawWatermark(ctx, w, h, cfg);
}
