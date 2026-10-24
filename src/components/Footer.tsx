import Link from "next/link";
import PixelIcon from "@/components/PixelIcon";

export default function Footer() {
  return (
    <footer className="mt-16 border-t-3 border-ink bg-ink py-5 text-paper">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4">
        <p className="flex items-center gap-2 font-display">
          © {new Date().getFullYear()} Qian Hui · made with
          <PixelIcon name="heart" fill="var(--color-bubble)" className="h-4 w-4" title="love" />
        </p>
        <Link
          href="/login"
          className="text-sm underline decoration-bubble decoration-2 underline-offset-4"
        >
          admin login
        </Link>
      </div>
    </footer>
  );
}
