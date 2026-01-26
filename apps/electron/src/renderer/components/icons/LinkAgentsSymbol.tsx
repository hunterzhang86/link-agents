interface LinkAgentsSymbolProps {
  className?: string
}

/**
 * Link Agents symbol - represents connection and linking
 * Pixel art style chain link icon
 * Uses accent color from theme (currentColor from className)
 */
export function LinkAgentsSymbol({ className }: LinkAgentsSymbolProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Left link */}
      <rect x="4" y="20" width="8" height="8" fill="currentColor" />
      <rect x="4" y="28" width="8" height="8" fill="currentColor" />
      <rect x="4" y="36" width="8" height="8" fill="currentColor" />
      <rect x="12" y="12" width="8" height="8" fill="currentColor" />
      <rect x="12" y="44" width="8" height="8" fill="currentColor" />
      <rect x="20" y="12" width="8" height="8" fill="currentColor" />
      <rect x="20" y="44" width="8" height="8" fill="currentColor" />

      {/* Center connection */}
      <rect x="28" y="28" width="8" height="8" fill="currentColor" />

      {/* Right link */}
      <rect x="36" y="12" width="8" height="8" fill="currentColor" />
      <rect x="36" y="44" width="8" height="8" fill="currentColor" />
      <rect x="44" y="12" width="8" height="8" fill="currentColor" />
      <rect x="44" y="44" width="8" height="8" fill="currentColor" />
      <rect x="52" y="20" width="8" height="8" fill="currentColor" />
      <rect x="52" y="28" width="8" height="8" fill="currentColor" />
      <rect x="52" y="36" width="8" height="8" fill="currentColor" />
    </svg>
  )
}
