/**
 * Semantic design tokens — the single source of truth for the GymSheet visual
 * identity. Values mirror the CSS custom properties in the web app
 * (`apps/web/src/app/globals.css`) so the Expo client renders the same dark,
 * high-contrast "volt" theme without duplicating hex codes.
 *
 * The dark theme is the default identity (`colors`). A light counterpart
 * (`lightColors`) and semantic status tones (`tones`) are provided so both
 * clients can offer a light mode from one source.
 */
export const colors = {
  background: '#000000',
  surfaceLowest: '#080808',
  surfaceLow: '#0d0d0d',
  surface: '#131313',
  surfaceHigh: '#1f1f1f',
  surfaceHighest: '#2a2a2a',
  surfaceSidebar: '#050505',
  borderSubtle: '#1a1a1a',
  border: '#262626',
  text: '#f5f5f5',
  textMuted: '#8c8c8c',
  textDisabled: '#4d4d4d',
  /** Vivid brand fill (use black text on top). */
  volt: '#c3f400',
  voltDim: '#abd600',
  /** Readable accent for text/icons on surfaces (equals `volt` in dark). */
  accentInk: '#c3f400',
  danger: '#ff6b63',
  warning: '#d7a944',
  success: '#c3f400',
} as const;

/** Light-theme counterpart. Same keys as `colors`. */
export const lightColors: Record<keyof typeof colors, string> = {
  background: '#f3f4f0',
  surfaceLowest: '#ffffff',
  surfaceLow: '#fafbf8',
  surface: '#ffffff',
  surfaceHigh: '#f0f1ec',
  surfaceHighest: '#e6e8e0',
  surfaceSidebar: '#ffffff',
  borderSubtle: '#e8e9e3',
  border: '#d5d7ce',
  text: '#14160e',
  textMuted: '#5c6053',
  textDisabled: '#a6a99d',
  volt: '#c3f400',
  voltDim: '#b4e300',
  accentInk: '#55730a',
  danger: '#c23b30',
  warning: '#8a6410',
  success: '#4d6b00',
};

/** Alias for clarity when both palettes are in scope. */
export const darkColors = colors;

/** Semantic status tones (background / border / text) per theme. */
export const tones = {
  dark: {
    success: { bg: '#182000', border: '#526800', text: '#c3f400' },
    warning: { bg: '#241c0c', border: '#5b4820', text: '#e0b65f' },
    danger: { bg: '#241211', border: '#63302c', text: '#ffb4ab' },
    info: { bg: '#111b21', border: '#344654', text: '#a8d4ee' },
  },
  light: {
    success: { bg: '#eef6cf', border: '#c0d766', text: '#4d6b00' },
    warning: { bg: '#fbf1d6', border: '#e6cd82', text: '#8a6410' },
    danger: { bg: '#fdeceb', border: '#f0b3ad', text: '#b23a30' },
    info: { bg: '#e9f2fb', border: '#aacdee', text: '#235d88' },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const radii = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 14,
  full: 9999,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  '2xl': 32,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Minimum touch target (px) for interactive mobile elements. */
export const minTouchTarget = 44;

/**
 * Motion — mirror of `--dur-*` / `--ease-*` in `apps/web/src/app/globals.css`.
 * A scale of intent, not of size:
 *   1 touch response (press)     2 hover / colour change
 *   3 short enter/exit           4 panel / dialog
 *   5 section reveal             6 scroll narrative
 * Milliseconds, so React Native `withTiming` and web both consume them raw.
 *
 * The mobile app keeps its own haptic-tuned palette and curve in
 * `apps/mobile/src/components/motion.tsx` (`DURATION`, `PREMIUM_EASING`) —
 * motion responds to the medium the same way the surface ramp does, so this is
 * the web baseline, available to mobile rather than imposed on it.
 * Every consumer must still honour `prefers-reduced-motion` /
 * `AccessibilityInfo.isReduceMotionEnabled`.
 */
export const durations = {
  1: 120,
  2: 180,
  3: 240,
  4: 320,
  5: 480,
  6: 640,
} as const;

/** Bézier control points — `[x1, y1, x2, y2]`, framework-agnostic. */
export const easings = {
  /** House curve (easeOutQuint): fast in, settles without bounce. */
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.4, 0, 1, 1],
} as const;

export const theme = {
  colors,
  spacing,
  radii,
  fontSizes,
  fontWeights,
  minTouchTarget,
  durations,
  easings,
} as const;

/** Both palettes keyed by mode, for theme-aware clients. */
export const themes = {
  dark: { ...theme, colors: darkColors, tones: tones.dark },
  light: { ...theme, colors: lightColors, tones: tones.light },
} as const;

export type ThemeMode = keyof typeof themes;
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type DurationToken = keyof typeof durations;
export type EasingToken = keyof typeof easings;
export type Theme = typeof theme;
export * from './tenants';
