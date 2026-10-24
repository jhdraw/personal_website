"use client";

/**
 * Renders an image with download deterrence:
 * - right-click / context menu blocked
 * - drag-to-save blocked
 * - mobile long-press save blocked (touch-callout)
 * - transparent overlay so "Save image as" never targets the <img>
 *
 * This deters casual saving; screenshots are always possible.
 *
 * fit="cover"   — fills a fixed-size box, cropping as needed (thumbnails,
 *                 banners). The consumer must give the box a height via
 *                 `className` (e.g. h-56 or max-h-[60vh]); overflow is clipped.
 * fit="contain" — shows the whole image at natural aspect ratio, capped by
 *                 the max-height/width passed in `className` (detail views).
 */
export default function ProtectedImage({
  src,
  alt,
  className = "",
  fit = "cover",
}: {
  src: string;
  alt: string;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const guards = {
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    style: { WebkitTouchCallout: "none" } as React.CSSProperties,
  };

  if (fit === "contain") {
    // Wrapper hugs the image; the size constraints live on the <img> itself.
    return (
      <span className="relative inline-block max-w-full select-none" {...guards}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`pointer-events-none block h-auto max-w-full object-contain ${className}`}
        />
        <span className="absolute inset-0" aria-hidden="true" />
      </span>
    );
  }

  return (
    <div className={`relative select-none overflow-hidden ${className}`} {...guards}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="pointer-events-none block h-full w-full object-cover"
      />
      <div className="absolute inset-0" aria-hidden="true" />
    </div>
  );
}
