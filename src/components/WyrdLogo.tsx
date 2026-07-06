/**
 * The Wyrd logo lockup — a needle threading through stitched, thread-colored
 * loops (the Wyrd Sisters weaving a life's line), with the WYRD wordmark
 * baked in below. Source: src/stitch_wyrd_logo_system/code.html.
 */

interface WyrdLogoProps {
  className?: string;
  /** Hide the baked-in "WYRD" text — used when pairing the mark with an HTML wordmark instead. */
  showWordmark?: boolean;
}

export default function WyrdLogo({ className, showWordmark = true }: WyrdLogoProps) {
  const h = showWordmark ? 400 : 360;
  return (
    <svg viewBox={`0 0 400 ${h}`} className={className} role="img" aria-label="Wyrd">
      <rect width="400" height={h} fill="#E8DCC4" />
      <defs>
        <pattern id="wyrdLogoDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.8" fill="#795548" opacity="0.25" />
        </pattern>
        <linearGradient id="wyrdLogoNeedle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C2185B" />
          <stop offset="100%" stopColor="#880E4F" />
        </linearGradient>
      </defs>
      <rect width="400" height={h} fill="url(#wyrdLogoDotGrid)" />
      <path d="M 198.5 40 L 201.5 40 L 201 320 L 200 340 L 199 320 Z" fill="url(#wyrdLogoNeedle)" />
      <ellipse cx="200" cy="72" rx="2.5" ry="8" fill="#E8DCC4" stroke="#C2185B" strokeWidth="1.2" />
      <path d="M 130 40 Q 130 72 200 72" fill="none" stroke="#C2185B" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round" />
      <path d="M 200 72 C 300 72 300 135 250 135" fill="none" stroke="#1B4332" strokeWidth="3" strokeLinecap="round" />
      <path d="M 250 135 C 200 135 200 135 200 135" fill="none" stroke="#B8860B" strokeWidth="3" strokeLinecap="round" />
      <path d="M 200 135 C 100 135 100 198 150 198" fill="none" stroke="#1B4332" strokeWidth="3" strokeLinecap="round" />
      <path d="M 150 198 C 200 198 200 198 200 198" fill="none" stroke="#B8860B" strokeWidth="3" strokeLinecap="round" />
      <path d="M 200 198 Q 270 198 270 280" fill="none" stroke="#C2185B" strokeWidth="3" strokeDasharray="6,4" strokeLinecap="round" />
      {showWordmark && (
        <text
          x="200"
          y="375"
          fontFamily="var(--font-cinzel), serif"
          fontSize="42"
          fontVariant="small-caps"
          letterSpacing="12"
          fill="#2D1B1B"
          textAnchor="middle"
          fontWeight="900"
        >
          WYRD
        </text>
      )}
    </svg>
  );
}
