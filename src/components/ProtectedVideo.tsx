"use client";

// Plays an uploaded video with the same download deterrence as ProtectedImage:
// right-click blocked, the browser's download button removed from the controls,
// and Picture-in-Picture disabled. As with images, this deters casual saving
// but cannot stop screen recording.
export default function ProtectedVideo({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <video
      src={src}
      controls
      controlsList="nodownload noplaybackrate"
      disablePictureInPicture
      preload="metadata"
      playsInline
      onContextMenu={(e) => e.preventDefault()}
      className={className}
    />
  );
}
