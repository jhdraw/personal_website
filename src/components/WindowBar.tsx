import PixelIcon from "@/components/PixelIcon";

// Retro desktop-window title bar ("Photo  _ □ ×"). Put it as the first child
// of a `.brutal` box that has no padding of its own.
export default function WindowBar({
  title,
  color = "bg-sky",
}: {
  title: string;
  color?: string;
}) {
  return (
    <div className={`win-bar ${color}`}>
      <span className="truncate">{title}</span>
      <span className="win-ctrls" aria-hidden>
        <PixelIcon name="minimize" className="" />
        <PixelIcon name="maximize" className="" />
        <PixelIcon name="close" className="" />
      </span>
    </div>
  );
}
