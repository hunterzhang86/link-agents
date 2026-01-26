interface LinkAgentsLogoProps {
  className?: string
}

/**
 * Link Agents pixel art logo - uses accent color from theme
 * Apply text-accent class to get the brand purple color
 * Spells out "LINK AGENTS" in pixel art style
 */
export function LinkAgentsLogo({ className }: LinkAgentsLogoProps) {
  return (
    <svg
      viewBox="0 0 520 66"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* L */}
      <rect x="0" y="0" width="10" height="66" fill="currentColor" />
      <rect x="10" y="56" width="30" height="10" fill="currentColor" />

      {/* I */}
      <rect x="50" y="0" width="10" height="66" fill="currentColor" />

      {/* N */}
      <rect x="70" y="0" width="10" height="66" fill="currentColor" />
      <rect x="80" y="20" width="10" height="10" fill="currentColor" />
      <rect x="90" y="30" width="10" height="10" fill="currentColor" />
      <rect x="100" y="0" width="10" height="66" fill="currentColor" />

      {/* K */}
      <rect x="120" y="0" width="10" height="66" fill="currentColor" />
      <rect x="130" y="26" width="10" height="14" fill="currentColor" />
      <rect x="140" y="16" width="10" height="10" fill="currentColor" />
      <rect x="150" y="0" width="10" height="16" fill="currentColor" />
      <rect x="140" y="40" width="10" height="10" fill="currentColor" />
      <rect x="150" y="50" width="10" height="16" fill="currentColor" />

      {/* Space */}

      {/* A */}
      <rect x="190" y="10" width="10" height="56" fill="currentColor" />
      <rect x="200" y="0" width="30" height="10" fill="currentColor" />
      <rect x="200" y="30" width="30" height="10" fill="currentColor" />
      <rect x="230" y="10" width="10" height="56" fill="currentColor" />

      {/* G */}
      <rect x="250" y="10" width="10" height="46" fill="currentColor" />
      <rect x="260" y="0" width="30" height="10" fill="currentColor" />
      <rect x="290" y="0" width="10" height="20" fill="currentColor" />
      <rect x="280" y="30" width="20" height="10" fill="currentColor" />
      <rect x="290" y="40" width="10" height="16" fill="currentColor" />
      <rect x="260" y="56" width="30" height="10" fill="currentColor" />

      {/* E */}
      <rect x="310" y="0" width="10" height="66" fill="currentColor" />
      <rect x="320" y="0" width="30" height="10" fill="currentColor" />
      <rect x="320" y="28" width="25" height="10" fill="currentColor" />
      <rect x="320" y="56" width="30" height="10" fill="currentColor" />

      {/* N */}
      <rect x="360" y="0" width="10" height="66" fill="currentColor" />
      <rect x="370" y="20" width="10" height="10" fill="currentColor" />
      <rect x="380" y="30" width="10" height="10" fill="currentColor" />
      <rect x="390" y="0" width="10" height="66" fill="currentColor" />

      {/* T */}
      <rect x="410" y="0" width="50" height="10" fill="currentColor" />
      <rect x="430" y="10" width="10" height="56" fill="currentColor" />

      {/* S */}
      <rect x="470" y="0" width="40" height="10" fill="currentColor" />
      <rect x="470" y="10" width="10" height="18" fill="currentColor" />
      <rect x="480" y="28" width="30" height="10" fill="currentColor" />
      <rect x="500" y="38" width="10" height="18" fill="currentColor" />
      <rect x="470" y="56" width="40" height="10" fill="currentColor" />
    </svg>
  )
}
