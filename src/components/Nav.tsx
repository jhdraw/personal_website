import Link from "next/link";
import PixelIcon from "@/components/PixelIcon";

const LINKS: [string, string, string][] = [
  ["/", "Home", "bg-yolk"],
  ["/blog", "Blog", "bg-bubble"],
  ["/albums", "Albums", "bg-sky"],
  ["/spotify", "Music", "bg-lime"],
  ["/qna", "Q&A", "bg-tangerine"],
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b-3 border-ink bg-paper">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-2.5">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-xl"
        >
          <PixelIcon name="heart" fill="var(--color-bubble)" className="h-6 w-6" />
          Qian Hui
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
          {LINKS.map(([href, label, color]) => (
            <Link
              key={href}
              href={href}
              className={`brutal-btn ${color} px-3 py-0.5 text-sm sm:text-base`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
