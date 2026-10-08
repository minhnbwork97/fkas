import { cn } from "@/lib/utils";

/**
 * Decorative chalk lines (halfway line, centre circle, penalty boxes)
 * drawn over a `.pitch-surface`. Purely visual.
 */
export function PitchMarkings({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-white/25",
        className
      )}
      viewBox="0 0 1000 200"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="12" y="12" width="976" height="176" />
      <line x1="500" y1="12" x2="500" y2="188" />
      <circle cx="500" cy="100" r="54" />
      <circle cx="500" cy="100" r="3" fill="currentColor" />
      <rect x="12" y="44" width="110" height="112" />
      <rect x="12" y="76" width="40" height="48" />
      <path d="M122 72 A 40 40 0 0 1 122 128" />
      <rect x="878" y="44" width="110" height="112" />
      <rect x="948" y="76" width="40" height="48" />
      <path d="M878 72 A 40 40 0 0 0 878 128" />
    </svg>
  );
}
