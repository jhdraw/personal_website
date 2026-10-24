"use client";

// Inline image renderer for Markdown content with the same download
// deterrence as ProtectedImage: blocks right-click, drag, and long-press.
// Used by MarkdownView so blog-post images get the same treatment as albums.
export default function ProtectedMarkdownImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  if (!src) return null;
  return (
    <span
      className="relative inline-block select-none align-middle"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} className="pointer-events-none" />
      <span className="absolute inset-0" aria-hidden="true" />
    </span>
  );
}
