/**
 * BarefootLoader — web
 *
 * Sequence:
 * 1. Foot pad draws ~270° open arc (stroke-dashoffset 120→0) — 1200ms
 * 2. Toe 1 draws 360° (dashoffset TOE_C→0) — 800ms
 * 3. Toe 2 accent draws 360° — 800ms
 * 4. Toe 3 draws 360° — 800ms
 * 5. Toe 4 pinky draws 360° — 800ms
 * 6. Hold — 600ms
 * 7. Foot pad undraws (dashoffset 0→120) — 1200ms
 * 8. All toes fade out — 400ms
 * 9. Loop
 */

interface BarefootLoaderProps {
  size?: number;
  theme?: "dark" | "light";
  className?: string;
}

const COLORS = {
  dark:  { primary: "#ffffff", accent: "#38bdf8" },
  light: { primary: "#0f172a", accent: "#38bdf8" },
};

const PAD_DRAW  = 120;   // ~270° of the open arc
const PAD_GAP   = 40;    // gap left at heel
const TOE_C     = 28.3;  // 2π × 4.5
const PINKY_C   = 22.0;  // 2π × 3.5

const T_PAD_IN  = 1200;
const T_TOE     = 800;
const T_HOLD    = 600;
const T_PAD_OUT = 1200;
const T_FADE    = 400;
const TOTAL     = T_PAD_IN + T_TOE * 4 + T_HOLD + T_PAD_OUT + T_FADE;

const S_T1      = T_PAD_IN;
const S_T2      = S_T1 + T_TOE;
const S_T3      = S_T2 + T_TOE;
const S_T4      = S_T3 + T_TOE;
const S_HOLD    = S_T4 + T_TOE;
const S_PAD_OUT = S_HOLD + T_HOLD;
const S_FADE    = S_PAD_OUT + T_PAD_OUT;

const p = (ms: number) => `${(ms / TOTAL * 100).toFixed(3)}%`;

export function BarefootLoader({ size = 120, theme = "dark", className }: BarefootLoaderProps) {
  const c = COLORS[theme];

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
        /* Foot pad: draws in, holds, undraws */
        @keyframes bf-pad {
          0%                { stroke-dashoffset: ${PAD_DRAW}; opacity: 0; }
          0.1%              { opacity: 1; }
          ${p(T_PAD_IN)}    { stroke-dashoffset: 0; opacity: 1; }
          ${p(S_PAD_OUT)}   { stroke-dashoffset: 0; opacity: 1; }
          ${p(S_FADE)}      { stroke-dashoffset: ${PAD_DRAW}; opacity: 1; }
          100%              { stroke-dashoffset: ${PAD_DRAW}; opacity: 0; }
        }

        /* Toe 1: hidden until S_T1, then draws 360°, holds, fades */
        @keyframes bf-t1 {
          0%, ${p(S_T1)}          { stroke-dashoffset: ${TOE_C}; opacity: 0; }
          ${p(S_T1 + 1)}          { stroke-dashoffset: ${TOE_C}; opacity: 1; }
          ${p(S_T2)}              { stroke-dashoffset: 0; opacity: 1; }
          ${p(S_FADE)}            { stroke-dashoffset: 0; opacity: 1; }
          100%                    { stroke-dashoffset: 0; opacity: 0; }
        }

        /* Toe 2: hidden until S_T2, then draws 360° */
        @keyframes bf-t2 {
          0%, ${p(S_T2)}          { stroke-dashoffset: ${TOE_C}; opacity: 0; }
          ${p(S_T2 + 1)}          { stroke-dashoffset: ${TOE_C}; opacity: 1; }
          ${p(S_T3)}              { stroke-dashoffset: 0; opacity: 1; }
          ${p(S_FADE)}            { stroke-dashoffset: 0; opacity: 1; }
          100%                    { stroke-dashoffset: 0; opacity: 0; }
        }

        /* Toe 3: hidden until S_T3, then draws 360° */
        @keyframes bf-t3 {
          0%, ${p(S_T3)}          { stroke-dashoffset: ${TOE_C}; opacity: 0; }
          ${p(S_T3 + 1)}          { stroke-dashoffset: ${TOE_C}; opacity: 1; }
          ${p(S_T4 + T_TOE)}      { stroke-dashoffset: 0; opacity: 1; }
          ${p(S_FADE)}            { stroke-dashoffset: 0; opacity: 1; }
          100%                    { stroke-dashoffset: 0; opacity: 0; }
        }

        /* Toe 4 (pinky): hidden until S_T4, then draws 360° */
        @keyframes bf-t4 {
          0%, ${p(S_T4)}          { stroke-dashoffset: ${PINKY_C}; opacity: 0; }
          ${p(S_T4 + 1)}          { stroke-dashoffset: ${PINKY_C}; opacity: 0.5; }
          ${p(S_HOLD)}            { stroke-dashoffset: 0; opacity: 0.5; }
          ${p(S_FADE)}            { stroke-dashoffset: 0; opacity: 0.5; }
          100%                    { stroke-dashoffset: 0; opacity: 0; }
        }
      `}</style>

      {/* Foot pad — open arc ~270° */}
      <path
        d="M 60 82 C 43 82, 33 71, 33 58 C 33 45, 42 37, 53 35 C 56 34, 60 34, 64 35 C 75 37, 84 45, 84 58 C 84 71, 74 82, 60 82"
        fill="none"
        stroke={c.primary}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${PAD_DRAW} ${PAD_GAP}`}
        style={{ animation: `bf-pad ${TOTAL}ms cubic-bezier(0.4,0,0.2,1) infinite` }}
      />

      {/* Toe 1 — left */}
      <circle cx={46} cy={28} r={4.5}
        fill="none" stroke={c.primary} strokeWidth={2.5}
        strokeDasharray={TOE_C}
        style={{ animation: `bf-t1 ${TOTAL}ms cubic-bezier(0.4,0,0.2,1) infinite` }}
      />

      {/* Toe 2 — middle accent */}
      <circle cx={57} cy={24} r={4.5}
        fill="none" stroke={c.accent} strokeWidth={2.5}
        strokeDasharray={TOE_C}
        style={{ animation: `bf-t2 ${TOTAL}ms cubic-bezier(0.4,0,0.2,1) infinite` }}
      />

      {/* Toe 3 — right */}
      <circle cx={68} cy={26} r={4.5}
        fill="none" stroke={c.primary} strokeWidth={2.5}
        strokeDasharray={TOE_C}
        style={{ animation: `bf-t3 ${TOTAL}ms cubic-bezier(0.4,0,0.2,1) infinite` }}
      />

      {/* Toe 4 — pinky */}
      <circle cx={78} cy={33} r={3.5}
        fill="none" stroke={c.primary} strokeWidth={2}
        strokeDasharray={PINKY_C}
        style={{ animation: `bf-t4 ${TOTAL}ms cubic-bezier(0.4,0,0.2,1) infinite` }}
      />
    </svg>
  );
}
