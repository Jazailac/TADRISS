/** Architectural linework built from the same open courtyard as the brand mark. */
export function CourtyardLines({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 600" fill="none" aria-hidden focusable="false" className={className}>
      <g stroke="currentColor" strokeWidth="1">
        <path d="M80 600V260a240 240 0 0 1 480 0v340" />
        <path d="M120 600V260a200 200 0 0 1 400 0v340" />
        <path d="M160 600V260a160 160 0 0 1 320 0v340" />
        <path d="M200 600V260a120 120 0 0 1 240 0v340" />
        <path d="M240 600V260a80 80 0 0 1 160 0v340" />
        <path d="M280 600V260a40 40 0 0 1 80 0v340" />
        <path d="M0 260h640M0 420h640M0 540h640M320 0v600" strokeDasharray="3 7" />
        <path d="M60 240h40m-20-20v40m460-20h40m-20-20v40M300 20h40m-20-20v40" />
      </g>
      <g fill="currentColor">
        <circle cx="80" cy="260" r="3" />
        <circle cx="560" cy="260" r="3" />
        <circle cx="320" cy="20" r="3" />
      </g>
    </svg>
  );
}
