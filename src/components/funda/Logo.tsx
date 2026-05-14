import { Link } from "@tanstack/react-router";

// Barefoot Labs concept-4 mark — foot pad + toes (static, no animation)
function BarefootMark({ size = 36, light = false }: { size?: number; light?: boolean }) {
  const primary = light ? "#ffffff" : "#0f172a";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Foot pad */}
      <ellipse cx="32" cy="40" rx="14" ry="16" fill={primary} />
      {/* Toe 1 — left */}
      <circle cx="20" cy="22" r="5" fill={primary} opacity={0.9} />
      {/* Toe 2 — middle (accent) */}
      <circle cx="29" cy="18" r="5" fill="#38bdf8" opacity={0.95} />
      {/* Toe 3 — right */}
      <circle cx="38" cy="20" r="5" fill={primary} opacity={0.9} />
      {/* Toe 4 — pinky */}
      <circle cx="46" cy="26" r="4" fill={primary} opacity={0.45} />
    </svg>
  );
}

export function FundaLogo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 font-bold text-lg">
      <BarefootMark size={36} light={light} />
      <span className={light ? "text-white" : "text-foreground"}>
        PASA<span className="text-accent">.</span>
      </span>
    </Link>
  );
}

// Standalone Barefoot Labs wordmark for footer / about page
export function BarefootLabsMark({ size = 20, light = false }: { size?: number; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <BarefootMark size={size} light={light} />
    </span>
  );
}
