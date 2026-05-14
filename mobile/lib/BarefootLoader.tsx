/**
 * BarefootLoader — animated foot-drawing loader for React Native.
 *
 * The foot pad outline traces itself first, then each toe circle draws in
 * sequence (left → middle accent → right → pinky), then everything fades
 * and the cycle repeats — like a pen drawing a footprint.
 *
 * Uses react-native-reanimated (already installed) + react-native-svg.
 */

import { useEffect } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BarefootLoaderProps {
  size?: number;
  theme?: 'dark' | 'light';
}

const COLORS = {
  dark:  { primary: '#ffffff', accent: '#38bdf8' },
  light: { primary: '#0f172a', accent: '#38bdf8' },
};

// Approximate stroke lengths
const PAD_LEN   = 160;
const TOE_LEN   = 28.3; // 2π × 4.5
const PINKY_LEN = 22.0; // 2π × 3.5

const DRAW_MS  = 700;  // time to draw each element
const HOLD_MS  = 600;  // hold fully drawn
const FADE_MS  = 300;  // fade out
const GAP_MS   = 150;  // gap between elements

function useStrokeAnim(totalLength: number, startDelay: number) {
  const offset  = useSharedValue(totalLength);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const cycleDuration = startDelay + DRAW_MS + HOLD_MS + FADE_MS + GAP_MS;

    offset.value = withRepeat(
      withSequence(
        withDelay(startDelay, withTiming(0, { duration: DRAW_MS, easing: Easing.inOut(Easing.ease) })),
        withTiming(0, { duration: HOLD_MS }),
        withTiming(totalLength, { duration: 0 }),
        withTiming(totalLength, { duration: GAP_MS }),
      ),
      -1,
      false,
    );

    opacity.value = withRepeat(
      withSequence(
        withDelay(startDelay, withTiming(1, { duration: 80 })),
        withTiming(1, { duration: DRAW_MS + HOLD_MS - 80 }),
        withTiming(0, { duration: FADE_MS }),
        withTiming(0, { duration: GAP_MS }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(offset);
      cancelAnimation(opacity);
    };
  }, []);

  return { offset, opacity };
}

export function BarefootLoader({ size = 120, theme = 'dark' }: BarefootLoaderProps) {
  const c = COLORS[theme];

  // Each element starts after the previous one begins drawing
  const pad   = useStrokeAnim(PAD_LEN,   0);
  const toe1  = useStrokeAnim(TOE_LEN,   DRAW_MS * 0.6);
  const toe2  = useStrokeAnim(TOE_LEN,   DRAW_MS * 0.6 + GAP_MS + DRAW_MS * 0.4);
  const toe3  = useStrokeAnim(TOE_LEN,   DRAW_MS * 0.6 + (GAP_MS + DRAW_MS * 0.4) * 2);
  const pinky = useStrokeAnim(PINKY_LEN, DRAW_MS * 0.6 + (GAP_MS + DRAW_MS * 0.4) * 3);

  const padProps = useAnimatedProps(() => ({
    strokeDashoffset: pad.offset.value,
    opacity: pad.opacity.value,
  }));

  const toe1Props = useAnimatedProps(() => ({
    strokeDashoffset: toe1.offset.value,
    opacity: toe1.opacity.value,
  }));

  const toe2Props = useAnimatedProps(() => ({
    strokeDashoffset: toe2.offset.value,
    opacity: toe2.opacity.value,
  }));

  const toe3Props = useAnimatedProps(() => ({
    strokeDashoffset: toe3.offset.value,
    opacity: toe3.opacity.value,
  }));

  const pinkyProps = useAnimatedProps(() => ({
    strokeDashoffset: pinky.offset.value,
    opacity: (pinky.opacity.value * 0.5) as number,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Foot pad — rounded teardrop */}
      <AnimatedPath
        animatedProps={padProps}
        d="M 60 82 C 43 82, 33 71, 33 58 C 33 45, 42 37, 53 35 C 56 34, 60 34, 64 35 C 75 37, 84 45, 84 58 C 84 71, 74 82, 60 82 Z"
        fill="none"
        stroke={c.primary}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={PAD_LEN}
      />

      {/* Toe 1 — left */}
      <AnimatedCircle
        animatedProps={toe1Props}
        cx={46} cy={28} r={4.5}
        fill="none"
        stroke={c.primary}
        strokeWidth={2.5}
        strokeDasharray={TOE_LEN}
      />

      {/* Toe 2 — middle (accent blue) */}
      <AnimatedCircle
        animatedProps={toe2Props}
        cx={57} cy={24} r={4.5}
        fill="none"
        stroke={c.accent}
        strokeWidth={2.5}
        strokeDasharray={TOE_LEN}
      />

      {/* Toe 3 — right */}
      <AnimatedCircle
        animatedProps={toe3Props}
        cx={68} cy={26} r={4.5}
        fill="none"
        stroke={c.primary}
        strokeWidth={2.5}
        strokeDasharray={TOE_LEN}
      />

      {/* Toe 4 — pinky */}
      <AnimatedCircle
        animatedProps={pinkyProps}
        cx={78} cy={33} r={3.5}
        fill="none"
        stroke={c.primary}
        strokeWidth={2}
        strokeDasharray={PINKY_LEN}
      />
    </Svg>
  );
}
