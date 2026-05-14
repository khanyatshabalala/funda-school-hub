/**
 * BarefootLoader
 * Animated SVG loader — a foot outline draws itself stroke by stroke,
 * then fades and repeats. Used on the login/splash screen.
 */

interface BarefootLoaderProps {
  size?: number;
  /** "dark" = white strokes on dark bg, "light" = navy strokes on light bg */
  theme?: "dark" | "light";
  className?: string;
}

const STROKE_COLOR = {
  dark:  { primary: "#ffffff", accent: "#38bdf8", bg: "#0f172a" },
  light: { primary: "#0f172a", accent: "#38bdf8", bg: "#ffffff" },
};

export function BarefootLoader({ size = 120, theme = "dark", className }: BarefootLoaderProps) {
  const c = STROKE_COLOR[theme];
  const duration = "2.4s";

  // Shared style for the draw animation
  const base = {
    fill: "none",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Loading…"
      role="img"
    >
      <style>{`
        @keyframes bf-draw-pad {
          0%   { stroke-dashoffset: 120; opacity: 0; }
          8%   { opacity: 1; }
          55%  { stroke-dashoffset: 0; opacity: 1; }
          82%  { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes bf-draw-toe {
          0%   { stroke-dashoffset: 30; opacity: 0; }
          8%   { opacity: 1; }
          55%  { stroke-dashoffset: 0; opacity: 1; }
          82%  { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
        @keyframes bf-draw-pinky {
          0%   { stroke-dashoffset: 22; opacity: 0; }
          8%   { opacity: 1; }
          55%  { stroke-dashoffset: 0; opacity: 1; }
          82%  { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>

      {/* ── Foot pad ── */}
      <path
        {...base}
        stroke={c.primary}
        strokeWidth={3}
        strokeDasharray={120}
        strokeDashoffset={120}
        d="M 60 82
           C 43 82, 33 71, 33 58
           C 33 45, 42 37, 53 35
           C 56 34, 60 34, 64 35
           C 75 37, 84 45, 84 58
           C 84 71, 74 82, 60 82 Z"
        style={{
          animation: `bf-draw-pad ${duration} ease-in-out infinite`,
        }}
      />

      {/* ── Toe 1 — left ── */}
      <circle
        {...base}
        stroke={c.primary}
        strokeWidth={2.5}
        cx={46} cy={28} r={4.5}
        strokeDasharray={30}
        strokeDashoffset={30}
        style={{
          animation: `bf-draw-toe ${duration} ease-in-out infinite`,
          animationDelay: "0.45s",
        }}
      />

      {/* ── Toe 2 — middle (accent) ── */}
      <circle
        {...base}
        stroke={c.accent}
        strokeWidth={2.5}
        cx={57} cy={24} r={4.5}
        strokeDasharray={30}
        strokeDashoffset={30}
        style={{
          animation: `bf-draw-toe ${duration} ease-in-out infinite`,
          animationDelay: "0.65s",
        }}
      />

      {/* ── Toe 3 — right ── */}
      <circle
        {...base}
        stroke={c.primary}
        strokeWidth={2.5}
        cx={68} cy={26} r={4.5}
        strokeDasharray={30}
        strokeDashoffset={30}
        style={{
          animation: `bf-draw-toe ${duration} ease-in-out infinite`,
          animationDelay: "0.85s",
        }}
      />

      {/* ── Toe 4 — pinky ── */}
      <circle
        {...base}
        stroke={c.primary}
        strokeWidth={2}
        cx={78} cy={33} r={3.5}
        strokeDasharray={22}
        strokeDashoffset={22}
        opacity={0.5}
        style={{
          animation: `bf-draw-pinky ${duration} ease-in-out infinite`,
          animationDelay: "1.05s",
        }}
      />
    </svg>
  );
}
