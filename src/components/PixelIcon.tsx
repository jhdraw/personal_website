// Tiny pixel-art icons drawn from character grids, so each pixel is one
// <rect> and they stay crisp at any size. "X" = outline (ink), "o" = fill.

const ICONS = {
  heart: `.XX...XX.
XooX.XooX
XoooXoooX
XoooooooX
.XoooooX.
..XoooX..
...XoX...
....X....`,
  star: `....X....
...XoX...
...XoX...
XXXXoXXXX
.XoooooX.
..XoooX..
.XoX.XoX.
XX.....XX`,
  note: `...XXXXX
...X...X
...XXXXX
...X...X
...X...X
.XXX.XXX
XooXXooX
.XX..XX.`,
  sparkle: `...X...
...X...
..XoX..
XXooXXX
..XoX..
...X...
...X...`,
  mail: `XXXXXXXXX
XXoooooXX
XoXoooXoX
XooXoXooX
XoooXoooX
XXXXXXXXX`,
  minimize: `.....
.....
.....
.....
XXXXX`,
  maximize: `XXXXX
X...X
X...X
X...X
XXXXX`,
  close: `X...X
.X.X.
..X..
.X.X.
X...X`,
} as const;

export type PixelIconName = keyof typeof ICONS;

export default function PixelIcon({
  name,
  className = "h-5 w-5",
  fill = "currentColor",
  title,
}: {
  name: PixelIconName;
  className?: string;
  fill?: string;
  title?: string;
}) {
  const rows = ICONS[name].split("\n");
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`pixel-art inline-block ${className}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === "X" || c === "o" ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={c === "X" ? "var(--color-ink)" : fill}
            />
          ) : null
        )
      )}
    </svg>
  );
}
