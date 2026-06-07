/**
 * Lightweight inline SVG illustrations for empty states. Keeping them as
 * components (instead of static asset files) means they inherit
 * `currentColor` and adapt to the current theme automatically.
 */

interface IllustrationProps {
  className?: string;
}

/** A clipboard / log icon — used by the Audit Logs empty state. */
export function ClipboardIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="clip-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="url(#clip-bg)" />
      <rect
        x="38"
        y="30"
        width="44"
        height="58"
        rx="6"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
      />
      <rect x="48" y="24" width="24" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
      <line x1="46" y1="50" x2="74" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <line x1="46" y1="60" x2="68" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <line x1="46" y1="70" x2="72" y2="70" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <line x1="46" y1="80" x2="60" y2="80" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

/** A magnifying-glass-over-doc icon — used when filters return zero rows. */
export function SearchIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="search-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" fill="url(#search-bg)" />
      <circle cx="54" cy="54" r="18" stroke="currentColor" strokeWidth="2.5" />
      <line
        x1="68"
        y1="68"
        x2="82"
        y2="82"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line x1="46" y1="50" x2="62" y2="50" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <line x1="46" y1="58" x2="58" y2="58" stroke="currentColor" strokeWidth="2" opacity="0.5" />
    </svg>
  );
}
